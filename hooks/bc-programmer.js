#!/usr/bin/env node
// bc-programmer — Global PreToolUse hook
//
// Fires on the first Write / Edit / MultiEdit / NotebookEdit of a session.
//
// Before any file is touched, it:
//   1. Reads the transcript to extract the task
//   2. Classifies complexity and type
//   3. Recommends the right GSD command or skill
//   4. Checks completeness (relevant files read? scope clear? verify plan?)
//   5. Blocks once with the full evaluation
//
// Also suppresses bc-planner (sets its flag) to avoid double-blocking.
// If a GSD workflow or skill invocation is detected in the transcript,
// the hook assumes the right approach is already in use and allows through.
//
// Session flags:
//   /tmp/bc-programmer-<id>.flag   — evaluation fired this session
//   /tmp/bc-planner-<id>.flag      — set here to suppress bc-planner

const fs   = require('fs');
const path = require('path');

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

const DOC_ONLY = new Set(['CLAUDE.md', 'README.md', '.gitignore', 'LICENSE']);

// Paths that are always safe to write without evaluation
const SKIP_PATHS = [
  /^\.planning\//,
  /^docs\//,
  /\.(md|json|yaml|yml|lock|log)$/,
];

// ── Read hook input ────────────────────────────────────────────────────────
let input;
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8');
  input = JSON.parse(raw);
} catch (_) {
  process.exit(0);
}

const { session_id, transcript_path, tool_name, tool_input } = input;

if (!EDIT_TOOLS.has(tool_name)) process.exit(0);
if (!session_id) process.exit(0);

// Skip doc-only / planning writes
const targetFile = tool_input?.file_path || tool_input?.path || '';
const basename   = path.basename(targetFile);
if (DOC_ONLY.has(basename)) process.exit(0);
if (SKIP_PATHS.some(re => re.test(targetFile))) process.exit(0);

// ── Session flags ──────────────────────────────────────────────────────────
const progFlag   = `/tmp/bc-programmer-${session_id}.flag`;
const planFlag   = `/tmp/bc-planner-${session_id}.flag`;

if (fs.existsSync(progFlag)) process.exit(0);

// ── Parse transcript ───────────────────────────────────────────────────────
function parseTranscript(tPath) {
  if (!tPath || !fs.existsSync(tPath)) return null;
  try {
    const lines = fs.readFileSync(tPath, 'utf8').split('\n').filter(Boolean);
    const userTexts  = [];
    let   gsdActive  = false;
    let   priorEdits = false;

    for (const line of lines) {
      let entry;
      try { entry = JSON.parse(line); } catch (_) { continue; }

      const role    = entry?.message?.role;
      const content = entry?.message?.content;
      if (!Array.isArray(content)) continue;

      for (const block of content) {
        // Collect user text (task descriptions)
        if (role === 'user' && block.type === 'text' && block.text) {
          userTexts.push(block.text.trim());
          // User invoked a GSD command or skill directly
          if (/\/gsd:|\/feature-dev|\/frontend-design|\/code-review|\/pr-review|\/commit/.test(block.text)) {
            gsdActive = true;
          }
        }

        // Detect assistant tool usage
        if (role === 'assistant' && block.type === 'tool_use') {
          // Prior file edits → evaluation already happened implicitly
          if (EDIT_TOOLS.has(block.name)) priorEdits = true;
          // Skill tool invocations
          if (block.name === 'Skill') {
            const skill = block.input?.skill || '';
            if (/gsd|feature-dev|frontend-design|code-review|pr-review|claude-api/.test(skill)) {
              gsdActive = true;
            }
          }
        }
      }
    }

    return { userTexts, gsdActive, priorEdits };
  } catch (_) {
    return null;
  }
}

const transcript = parseTranscript(transcript_path);

// Allow through: GSD/skill already active, or prior edits exist
if (transcript?.gsdActive || transcript?.priorEdits) {
  fs.writeFileSync(progFlag, 'gsd-or-skill-active');
  fs.writeFileSync(planFlag, 'handled-by-bc-programmer');
  process.exit(0);
}

// ── Extract task text ──────────────────────────────────────────────────────
const allUserText = (transcript?.userTexts ?? []).join(' ');
// Use last substantive user message as the task description
const taskText = (transcript?.userTexts ?? [])
  .filter(t => t.length > 15)
  .slice(-1)[0] ?? allUserText ?? '';

const taskExcerpt = taskText.length > 200
  ? taskText.slice(0, 200).trimEnd() + '…'
  : taskText || '(could not extract task from transcript)';

// ── Task classification ────────────────────────────────────────────────────
function classify(text) {
  const t = text.toLowerCase();

  // ── GSD: complex / multi-phase ──
  if (/\b(new (project|app|system|service|platform|product)|from scratch|greenfield|initialize|bootstrap)\b/.test(t)) {
    return { complexity: 'HIGH', type: 'New Project',
      primary:   '/gsd:new-project',
      alternate: '/gsd:plan-phase 1',
      reason:    'Requires deep questioning → research → requirements → roadmap → phased execution' };
  }

  if (/\b(new (feature|module|integration|api endpoint|component set)|refactor (entire|all|the whole)|migrate|overhaul|redesign|rewrite|architecture)\b/.test(t)) {
    return { complexity: 'HIGH', type: 'Complex Feature / Refactor',
      primary:   '/gsd:plan-phase',
      alternate: '/gsd:quick',
      reason:    'Multi-step work benefits from research → plan → execute → verify loop' };
  }

  // ── GSD: debug ──
  if (/\b(bug|debug|trace|investigate|root cause|why (is|does|isn)|not working|broken|failing|error|exception|crash|regression)\b/.test(t)) {
    return { complexity: 'VARIABLE', type: 'Bug Investigation',
      primary:   '/gsd:debug',
      alternate: 'Direct (if trivial)',
      reason:    'Systematic debugging with hypothesis tracking survives context resets' };
  }

  // ── Skill: frontend / UI ──
  if (/\b(ui|ux|frontend|page|component|design|css|style|layout|responsive|animation|landing|dashboard|screen)\b/.test(t)) {
    return { complexity: 'MEDIUM', type: 'Frontend / UI',
      primary:   '/frontend-design  (skill)',
      alternate: '/gsd:quick',
      reason:    'Production-grade UI generation with design quality focus; avoids generic aesthetics' };
  }

  // ── Skill: code review / PR ──
  if (/\b(review (code|pr|this|the|my)|pull request|merge request|audit|check (code|quality))\b/.test(t)) {
    return { complexity: 'MEDIUM', type: 'Code / PR Review',
      primary:   '/pr-review-toolkit  (skill)',
      alternate: '/code-review  (skill)',
      reason:    'Specialized parallel review agents for style, silent failures, tests, type design' };
  }

  // ── Skill: feature dev (implement / add / build something concrete) ──
  if (/\b(implement|build|create|add|develop|integrate|support for|enable)\b/.test(t)) {
    return { complexity: 'MEDIUM', type: 'Feature Development',
      primary:   '/feature-dev  (skill)',
      alternate: '/gsd:quick',
      reason:    'Codebase exploration + architecture design before writing code' };
  }

  // ── GSD: quick contained task ──
  if (/\b(update|change|rename|move|delete|remove|swap|replace|fix (the|a|this|small))\b/.test(t)) {
    return { complexity: 'LOW', type: 'Contained Change',
      primary:   '/gsd:quick',
      alternate: 'Direct',
      reason:    'Atomic commits + state tracking even for small work; easy to skip if trivial' };
  }

  // Default
  return { complexity: 'LOW', type: 'Focused Task',
    primary:   'Direct (write a clear plan first)',
    alternate: '/gsd:quick  (if you want state tracking)',
    reason:    'Task appears small and contained' };
}

const assessment = classify(taskText || '');

// ── Build blocking message ─────────────────────────────────────────────────
const L = [];
const hr = '─'.repeat(52);

L.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
L.push(` bc-programmer — Pre-Change Routing Evaluation`);
L.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
L.push(``);
L.push(`Task detected:`);
L.push(`  "${taskExcerpt}"`);
L.push(``);
L.push(`Analysis:`);
L.push(`  Complexity : ${assessment.complexity}`);
L.push(`  Type       : ${assessment.type}`);
L.push(``);
L.push(`Recommended:`);
L.push(`  ► ${assessment.primary}`);
L.push(`  Reason: ${assessment.reason}`);
L.push(``);
L.push(`Alternate:`);
L.push(`  • ${assessment.alternate}`);
L.push(``);
L.push(hr);
L.push(`Workflow reference:`);
L.push(`  /gsd:new-project    brand-new project: question→research→roadmap`);
L.push(`  /gsd:plan-phase N   research + plan one phase before executing`);
L.push(`  /gsd:execute-phase  execute a planned phase with atomic commits`);
L.push(`  /gsd:quick          fast task with GSD guarantees, no phase needed`);
L.push(`  /gsd:debug          hypothesis-driven bug investigation`);
L.push(`  /feature-dev        guided feature dev with codebase exploration`);
L.push(`  /frontend-design    production-grade UI generation`);
L.push(`  /pr-review-toolkit  comprehensive PR review (parallel agents)`);
L.push(`  /code-review        targeted code quality review`);
L.push(hr);
L.push(``);
L.push(`Before touching any files, confirm ALL of the following:`);
L.push(``);
L.push(`  1. Approach — you are using the recommended workflow above`);
L.push(`       (or have a clear reason to deviate)`);
L.push(``);
L.push(`  2. Scope — you have read every file relevant to this task`);
L.push(`       and understand what each one does`);
L.push(``);
L.push(`  3. Plan — you can state in 3–5 bullet points exactly what`);
L.push(`       will change, why, and in what order`);
L.push(``);
L.push(`  4. Completeness — you know what "done" looks like and how`);
L.push(`       you will verify the change is correct and complete`);
L.push(``);
L.push(`  5. Tests — you know which tests cover this area and whether`);
L.push(`       new tests will be needed`);
L.push(``);
L.push(`Write out your answers to (2)–(5), then proceed.`);
L.push(`(This evaluation fires once per session.)`);

// Set both flags now — bc-planner will not fire again this session
fs.writeFileSync(progFlag, JSON.stringify({ complexity: assessment.complexity, type: assessment.type }));
fs.writeFileSync(planFlag, 'handled-by-bc-programmer');

process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: L.join('\n'),
}));

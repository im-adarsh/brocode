#!/usr/bin/env node
// bc-planner — Global PreToolUse hook
//
// Fires before Write / Edit / MultiEdit / NotebookEdit.
//
// On the first destructive action of a session, blocks once and asks
// Claude to write out a complete plan (what, why, order) before touching
// any files. Subsequent edits in the same session are allowed through.
//
// State: /tmp/bc-planner-<session_id>.flag
//   absent  → plan not yet requested this session
//   present → plan was requested; edits are now allowed

const fs   = require('fs');
const path = require('path');
const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

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

// ── Skip docs-only writes (e.g. CLAUDE.md, README.md themselves) ──────────
const targetFile = tool_input?.file_path || tool_input?.path || '';
const basename   = path.basename(targetFile);
const DOC_ONLY   = new Set(['CLAUDE.md', 'README.md', '.gitignore', 'LICENSE']);
if (DOC_ONLY.has(basename)) process.exit(0);

// ── Session flag: only block once per session ─────────────────────────────
if (!session_id) process.exit(0);
const flagFile = `/tmp/bc-planner-${session_id}.flag`;
if (fs.existsSync(flagFile)) process.exit(0);

// ── Check transcript for prior edit tool calls ────────────────────────────
// If Claude already made edits earlier in this session, don't block again.
if (transcript_path && fs.existsSync(transcript_path)) {
  try {
    const lines = fs.readFileSync(transcript_path, 'utf8')
      .split('\n')
      .filter(Boolean);

    for (const line of lines) {
      let entry;
      try { entry = JSON.parse(line); } catch (_) { continue; }

      // Look for assistant messages that already used an edit tool
      const content = entry?.message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block.type === 'tool_use' && EDIT_TOOLS.has(block.name)) {
          // Prior edit found — plan was presumably established; allow.
          fs.writeFileSync(flagFile, 'prior-edits-found');
          process.exit(0);
        }
      }
    }
  } catch (_) {
    // Transcript unreadable — don't block
    process.exit(0);
  }
}

// ── First edit in session — request a plan ────────────────────────────────
// Write the flag NOW so that if Claude immediately re-attempts the same
// edit after writing the plan, it is allowed through.
fs.writeFileSync(flagFile, 'plan-requested');

process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: [
    `You are about to make your first file change (${tool_name}: ${basename || 'unknown'}).`,
    ``,
    `Before touching any files, write out your complete plan:`,
    `  1. What you are going to change and in which files`,
    `  2. Why each change is needed`,
    `  3. The order you will make the changes in`,
    `  4. Any risks or things to watch out for`,
    ``,
    `After writing the plan, proceed with the changes.`,
    `(This prompt only appears once per session.)`,
  ].join('\n'),
}));

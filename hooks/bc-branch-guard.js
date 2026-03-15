#!/usr/bin/env node
// bc-branch-guard — Global PreToolUse hook
//
// Fires before any Bash call containing "git push" or "git commit".
//
// Protects long-lived branches from direct commits / pushes:
//   - git push  → BLOCK on main / master / production / prod
//   - git commit → WARN on main / master (soft block — explains risk)
//
// Allows through:
//   - Feature / topic branches (anything not in PROTECTED)
//   - Merge commits (--no-ff, already merged)
//   - Explicit force-push (user consciously chose it — we don't second-guess)
//   - If a .bc-branch-override file exists in the repo root (opt-out)

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ── Read hook input ────────────────────────────────────────────────────────
let input;
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8');
  input = JSON.parse(raw);
} catch (_) { process.exit(0); }

if (input.tool_name !== 'Bash') process.exit(0);

const cmd = (input.tool_input?.command ?? '').trim();

const isPush   = /\bgit\s+push\b/.test(cmd);
const isCommit = /\bgit\s+commit\b/.test(cmd);
if (!isPush && !isCommit) process.exit(0);

// ── Helpers ────────────────────────────────────────────────────────────────
function git(...args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

// ── Per-repo opt-out ───────────────────────────────────────────────────────
const gitRoot = git('rev-parse', '--show-toplevel');
if (gitRoot && fs.existsSync(path.join(gitRoot, '.bc-branch-override'))) process.exit(0);

// ── Get current branch ─────────────────────────────────────────────────────
const branch = git('branch', '--show-current');
if (!branch) process.exit(0);

const PROTECTED = new Set(['main', 'master', 'production', 'prod', 'release', 'stable']);
if (!PROTECTED.has(branch)) process.exit(0);

// Allow explicit force-push (user knowingly dangerous)
if (/--force|-f\b/.test(cmd)) process.exit(0);

// ── Determine suggested branch name from recent commit or cwd ─────────────
const lastMsg   = git('log', '--pretty=%s', '-1') || '';
const suggested = lastMsg
  .toLowerCase()
  .replace(/^(feat|fix|docs|chore|refactor|test|perf|ci|build|style)\(?[^)]*\)?!?:\s*/i, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40) || 'feature/my-change';

// ── Build message ──────────────────────────────────────────────────────────
const L = [];

if (isPush) {
  L.push(`Direct push to "${branch}" is blocked.`);
  L.push(``);
  L.push(`Pushing directly to ${branch} bypasses code review and can introduce`);
  L.push(`regressions that affect everyone working from this branch.`);
  L.push(``);
  L.push(`Recommended workflow:`);
  L.push(`  1. Create a feature branch from your current changes:`);
  L.push(`       git checkout -b ${suggested}`);
  L.push(`  2. Push the feature branch:`);
  L.push(`       git push -u origin ${suggested}`);
  L.push(`  3. Open a pull / merge request for review`);
  L.push(``);
  L.push(`To opt out of this check for this repo, create a .bc-branch-override`);
  L.push(`file at the repo root (e.g. for solo projects or documentation repos).`);
  process.stdout.write(JSON.stringify({ decision: 'block', reason: L.join('\n') }));
} else {
  // Commit to protected branch — softer warning
  L.push(`You are committing directly to "${branch}".`);
  L.push(``);
  L.push(`For shared repos, prefer a feature branch + PR workflow:`);
  L.push(`  git checkout -b ${suggested}`);
  L.push(`  # ... commit here, then push + open PR`);
  L.push(``);
  L.push(`Proceed only if this is a solo / personal repo or a deliberate`);
  L.push(`hotfix with team awareness. To continue, re-run the commit.`);
  L.push(``);
  L.push(`(To opt out permanently for this repo, add .bc-branch-override to root.)`);
  process.stdout.write(JSON.stringify({ decision: 'block', reason: L.join('\n') }));
}

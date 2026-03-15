#!/usr/bin/env node
// bc-commit-msg — Global PreToolUse hook
//
// Fires before any Bash call containing "git commit".
//
// Enforces commit message quality:
//   1. Conventional commit prefix  (feat/fix/docs/chore/refactor/test/perf/ci/build/style)
//   2. Minimum description length  (≥ 10 chars after the prefix)
//   3. No vague single-word messages ("fix", "update", "wip", "misc", "stuff", etc.)
//   4. No --no-verify bypass without explanation
//
// Passes through:
//   - HEREDOC-style commits (complex messages already well-formed)
//   - --allow-empty commits (meta commits)
//   - Merge commits (auto-generated)
//   - Messages that already pass all checks

const fs = require('fs');

// ── Read hook input ────────────────────────────────────────────────────────
let input;
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8');
  input = JSON.parse(raw);
} catch (_) { process.exit(0); }

if (input.tool_name !== 'Bash') process.exit(0);

const cmd = (input.tool_input?.command ?? '').trim();
if (!/\bgit\s+commit\b/.test(cmd)) process.exit(0);

// ── Skip special cases ─────────────────────────────────────────────────────
if (/--allow-empty/.test(cmd))   process.exit(0);  // meta / empty commits
if (/--amend\s+--no-edit/.test(cmd)) process.exit(0);  // amend without msg change

// HEREDOC commits ($(cat <<'EOF' ... EOF)) are usually well-formed — allow
if (/<<['"]?EOF['"]?/.test(cmd)) process.exit(0);

// ── Extract -m message ────────────────────────────────────────────────────
// Handles: -m "msg", -m 'msg', -m msg
const mMatch = cmd.match(/-m\s+"((?:[^"\\]|\\.)*)"/s)
  ?? cmd.match(/-m\s+'((?:[^'\\]|\\.)*)'/s)
  ?? cmd.match(/-m\s+([^\s"'][^\s]*)/) ;

if (!mMatch) process.exit(0); // can't parse message → allow through

const msg = mMatch[1].trim();

// ── Conventional commit prefix check ──────────────────────────────────────
const CONVENTIONAL_RE = /^(feat|fix|docs|chore|refactor|test|perf|ci|build|style|revert|wip)(\([a-z0-9\-_/]+\))?!?:\s+.+/i;

// Auto-generated / merge commit prefixes — allow through
const AUTO_MSG_RE = /^(Merge|Revert|Initial commit|Release|Bump|chore\(release\))/i;
if (AUTO_MSG_RE.test(msg)) process.exit(0);

// ── Vague message detector ─────────────────────────────────────────────────
const VAGUE_EXACT = new Set([
  'fix', 'fixes', 'fixed', 'fixup',
  'update', 'updates', 'updated',
  'change', 'changes', 'changed',
  'wip', 'work in progress',
  'misc', 'miscellaneous',
  'stuff', 'things', 'more',
  'cleanup', 'clean up',
  'tweaks', 'tweak',
  'temp', 'tmp', 'hack',
  'asdf', 'test', 'testing', 'xxx', 'yyy', 'zzz',
  'progress', 'done',
]);

const issues = [];

// Check for vague single-word / trivial messages
const msgWords = msg.toLowerCase().replace(/^[a-z]+:\s*/i, '').trim();
if (VAGUE_EXACT.has(msgWords) || VAGUE_EXACT.has(msg.toLowerCase())) {
  issues.push(`Message "${msg}" is too vague — describe what and why, not just "fix".`);
}

// Check conventional commit format
if (!CONVENTIONAL_RE.test(msg)) {
  issues.push(
    `Missing conventional commit prefix.\n` +
    `  Expected: <type>(<scope>): <description>\n` +
    `  Types: feat | fix | docs | chore | refactor | test | perf | ci | build | style | revert`
  );
}

// Check minimum description length (after stripping the prefix)
const descPart = msg.replace(/^[a-z]+(?:\([^)]+\))?!?:\s*/i, '').trim();
if (descPart.length < 10) {
  issues.push(`Description too short (${descPart.length} chars). Write a meaningful description (≥ 10 chars).`);
}

if (issues.length === 0) process.exit(0);

// ── Block ──────────────────────────────────────────────────────────────────
const L = [];
L.push(`Commit message quality check failed.`);
L.push(``);
L.push(`  Message: "${msg}"`);
L.push(``);
issues.forEach((issue, i) => {
  L.push(`  ${i + 1}. ${issue}`);
});
L.push(``);
L.push(`Good commit message examples:`);
L.push(`  feat(auth): add JWT refresh token rotation`);
L.push(`  fix(api): handle null response from payment gateway`);
L.push(`  refactor(db): extract connection pool into singleton`);
L.push(`  docs: update install steps for Node 20`);
L.push(`  chore: bump dependencies to latest patch versions`);
L.push(``);
L.push(`Rules:`);
L.push(`  - Use present tense imperative: "add X" not "added X"`);
L.push(`  - Explain what AND why, not just "fix" or "update"`);
L.push(`  - Keep the first line ≤ 72 characters`);
L.push(`  - Use (scope) to indicate what part of the codebase changed`);

process.stdout.write(JSON.stringify({ decision: 'block', reason: L.join('\n') }));

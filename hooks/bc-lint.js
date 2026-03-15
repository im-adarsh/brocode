#!/usr/bin/env node
// bc-lint — Global PreToolUse hook
//
// Fires before any Bash call containing "git commit".
//
// If the repo has a lint / type-check script, runs it against staged files
// and blocks the commit if it fails — forcing Claude to fix the issues first.
//
// Detected runners (in priority order):
//   npm  → lint-staged, lint, eslint, tsc / type-check
//   pnpm → same
//   bun  → same
//   yarn → same
//   Makefile → lint target
//
// Passes through:
//   - Repos with no lint tooling (silent)
//   - Doc-only commits (only .md / .json / .yaml staged)
//   - Merge commits, --allow-empty
//   - HEREDOC commits (assumed well-formed)

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
if (!/\bgit\s+commit\b/.test(cmd)) process.exit(0);
if (/--allow-empty|--amend\s+--no-edit|<<['"]?EOF['"]?/.test(cmd)) process.exit(0);

// ── Helpers ────────────────────────────────────────────────────────────────
function run(prog, args, cwd) {
  return spawnSync(prog, args, { encoding: 'utf8', cwd, timeout: 60_000 });
}
function git(...args) {
  const r = run('git', args);
  return r.status === 0 ? r.stdout.trim() : '';
}

const gitRoot = git('rev-parse', '--show-toplevel');
if (!gitRoot) process.exit(0);

// ── Check staged files ─────────────────────────────────────────────────────
const staged = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
if (staged.length === 0) process.exit(0);

// Skip if only docs / config are staged (no lintable code)
const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|go|rb|rs|java|kt|swift|cs|php)$/;
const hasCode  = staged.some(f => CODE_EXT.test(f));
if (!hasCode) process.exit(0);

// ── Detect lint runner ─────────────────────────────────────────────────────
function detectRunner() {
  const pkgPath = path.join(gitRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    let pkg;
    try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch (_) { pkg = {}; }
    const scripts = pkg.scripts ?? {};

    // Detect package manager
    const hasPnpm   = fs.existsSync(path.join(gitRoot, 'pnpm-lock.yaml'));
    const hasBun    = fs.existsSync(path.join(gitRoot, 'bun.lockb'));
    const hasYarn   = fs.existsSync(path.join(gitRoot, 'yarn.lock'));
    const pm        = hasPnpm ? 'pnpm' : hasBun ? 'bun' : hasYarn ? 'yarn' : 'npm';

    // Prefer lint-staged (runs only on staged files, fast)
    if (scripts['lint-staged'])  return { cmd: [pm, 'run', 'lint-staged'],  label: `${pm} run lint-staged` };
    // type-check before lint (catches more)
    if (scripts['type-check'])   return { cmd: [pm, 'run', 'type-check'],   label: `${pm} run type-check` };
    if (scripts['typecheck'])    return { cmd: [pm, 'run', 'typecheck'],     label: `${pm} run typecheck` };
    if (scripts['tsc'])          return { cmd: [pm, 'run', 'tsc'],           label: `${pm} run tsc` };
    if (scripts['lint'])         return { cmd: [pm, 'run', 'lint'],          label: `${pm} run lint` };
    if (scripts['eslint'])       return { cmd: [pm, 'run', 'eslint'],        label: `${pm} run eslint` };
    if (scripts['check'])        return { cmd: [pm, 'run', 'check'],         label: `${pm} run check` };
  }

  // Makefile with lint target
  const makefile = path.join(gitRoot, 'Makefile');
  if (fs.existsSync(makefile)) {
    const mk = fs.readFileSync(makefile, 'utf8');
    if (/^lint:/m.test(mk)) return { cmd: ['make', 'lint'], label: 'make lint' };
  }

  // Go vet
  if (fs.existsSync(path.join(gitRoot, 'go.mod'))) {
    return { cmd: ['go', 'vet', './...'], label: 'go vet ./...' };
  }

  return null;
}

const runner = detectRunner();
if (!runner) process.exit(0); // no lint tooling → allow through

// ── Run the linter ─────────────────────────────────────────────────────────
const result = run(runner.cmd[0], runner.cmd.slice(1), gitRoot);

if (result.status === 0) process.exit(0); // lint passed → allow commit

// ── Block — lint failed ────────────────────────────────────────────────────
const stdout = (result.stdout ?? '').trim();
const stderr = (result.stderr ?? '').trim();
const output = [stdout, stderr].filter(Boolean).join('\n');

// Trim very long output
const trimmed = output.length > 2000
  ? output.slice(0, 2000) + '\n... (output truncated)'
  : output;

const L = [];
L.push(`Lint / type-check failed — commit blocked.`);
L.push(``);
L.push(`Runner: ${runner.label}`);
L.push(`Exit code: ${result.status}`);
L.push(``);
if (trimmed) {
  L.push(`Output:`);
  trimmed.split('\n').forEach(line => L.push(`  ${line}`));
  L.push(``);
}
L.push(`Fix all errors above, then re-run the commit.`);
L.push(`Warnings may be acceptable if your project is configured to allow them.`);

process.stdout.write(JSON.stringify({ decision: 'block', reason: L.join('\n') }));

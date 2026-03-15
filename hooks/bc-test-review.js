#!/usr/bin/env node
// bc-test-review — Global PreToolUse hook
//
// Fires before any Bash tool call that contains "git commit".
//
// Checks whether staged source-code changes have corresponding test
// updates. If source changed but tests were not touched, blocks and
// asks Claude to:
//   1. Review what tests already exist for the changed code
//   2. Add / update tests where needed (quality over quantity)
//   3. Run the test suite and confirm it passes
//   4. Then commit
//
// Quality bar enforced in the prompt:
//   - Tests must assert behaviour, not just "does it run"
//   - Tests must cover meaningful edge cases
//   - Tests must be readable and maintainable
//   - No test-count padding (fewer great tests > many trivial ones)
//
// Skips repos with no test infrastructure at all.
// Skips if only docs / config / lock files changed.

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ── Read hook input ────────────────────────────────────────────────────────
let input;
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8');
  input = JSON.parse(raw);
} catch (_) {
  process.exit(0);
}

if (input.tool_name !== 'Bash') process.exit(0);

const cmd = (input.tool_input?.command || '').trim();
if (!/\bgit\s+commit\b/.test(cmd)) process.exit(0);

// ── Helpers ────────────────────────────────────────────────────────────────
function git(...args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

function find(...args) {
  const r = spawnSync('find', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

// ── Staged files ───────────────────────────────────────────────────────────
const staged = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
if (staged.length === 0) process.exit(0);

// ── File classifiers ───────────────────────────────────────────────────────
// Patterns that identify test files
const TEST_FILE_RE = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /(^|\/)__tests__\//,
  /(^|\/)tests?\//,
  /test_[^/]+\.py$/,
  /[^/]+_test\.py$/,
  /[^/]+_test\.go$/,
];

// Source-code extensions we care about (behaviour lives here)
const SOURCE_EXT_RE = /\.(js|jsx|ts|tsx|py|go|rb|rs|java|kt|swift|c|cpp|cs)$/;

// Files to ignore entirely (config, docs, build artefacts)
const IGNORE_RE = [
  /\.(md|json|yaml|yml|toml|env|lock|log|map|snap)$/,
  /^(\.gitignore|\.editorconfig|Makefile|Dockerfile|LICENSE)$/i,
  /^(dist|build|out|\.next|\.nuxt|node_modules)\//,
  /^\.planning\//,
];

function isTestFile(f)   { return TEST_FILE_RE.some(re => re.test(f)); }
function isSourceFile(f) { return SOURCE_EXT_RE.test(f) && !isTestFile(f); }
function isIgnored(f)    { return IGNORE_RE.some(re => re.test(path.basename(f))) || IGNORE_RE.some(re => re.test(f)); }

const sourceChanged = staged.filter(f => isSourceFile(f) && !isIgnored(f));
const testChanged   = staged.filter(f => isTestFile(f));

// Only care when source files are staged
if (sourceChanged.length === 0) process.exit(0);

// ── Detect test infrastructure ─────────────────────────────────────────────
// If the repo has no test runner at all, don't nag about tests.
const gitRoot = git('rev-parse', '--show-toplevel');

function hasTestInfra() {
  // package.json with a test script
  const pkgPath = path.join(gitRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
        return { runner: pkg.scripts.test, kind: 'npm test' };
      }
    } catch (_) {}
  }

  // pytest
  if (
    fs.existsSync(path.join(gitRoot, 'pytest.ini')) ||
    fs.existsSync(path.join(gitRoot, 'pyproject.toml')) ||
    fs.existsSync(path.join(gitRoot, 'setup.cfg'))
  ) return { runner: 'pytest', kind: 'pytest' };

  // go test
  if (fs.existsSync(path.join(gitRoot, 'go.mod'))) return { runner: 'go test ./...', kind: 'go test' };

  // Makefile with a test target
  const makefile = path.join(gitRoot, 'Makefile');
  if (fs.existsSync(makefile)) {
    const mk = fs.readFileSync(makefile, 'utf8');
    if (/^test:/m.test(mk)) return { runner: 'make test', kind: 'make test' };
  }

  // Presence of any test files at all
  const anyTests = find(gitRoot,
    '-type', 'f',
    '(', '-name', '*.test.js', '-o', '-name', '*.spec.ts', '-o', '-name', '*_test.go', '-o', '-name', 'test_*.py', ')',
    '-not', '-path', '*/node_modules/*',
    '-not', '-path', '*/.git/*',
  );
  if (anyTests) return { runner: null, kind: 'existing test files' };

  return null;
}

const infra = hasTestInfra();
if (!infra) process.exit(0); // No test setup → skip silently

// ── Tests already updated → allow ─────────────────────────────────────────
if (testChanged.length > 0) process.exit(0);

// ── Block and request test review ─────────────────────────────────────────
const srcList  = sourceChanged.slice(0, 6).join(', ')
  + (sourceChanged.length > 6 ? ` (+${sourceChanged.length - 6} more)` : '');

process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: [
    `Source files staged for commit: ${srcList}`,
    `No test files were updated.`,
    ``,
    `Before committing, please:`,
    `  1. Review existing tests for the changed files`,
    `  2. Add or update tests that cover the new/changed behaviour`,
    `  3. Run the test suite (${infra.kind}) and confirm all tests pass`,
    `  4. Then commit`,
    ``,
    `Quality bar:`,
    `  - Tests must assert specific behaviour, not just "does it run"`,
    `  - Cover meaningful edge cases (nulls, boundaries, error paths)`,
    `  - Each test should have a clear, readable name and single purpose`,
    `  - Prefer fewer, high-value tests over many trivial ones`,
    `  - Do NOT add tests just to increase count`,
    ``,
    `If these changes genuinely don't need test updates (e.g. pure refactor`,
    `with existing coverage, or infra-only change), explain why and add`,
    `--no-verify to the commit or re-run with that justification.`,
  ].join('\n'),
}));

#!/usr/bin/env node
// bc-secret-guard — Global PreToolUse hook
//
// Fires before Write / Edit / MultiEdit.
//
// Scans the content about to be written for hardcoded credentials and
// secrets. Blocks if a real-looking secret is found in a file that
// would be tracked by git.
//
// Allows through:
//   - Placeholder values (YOUR_..._HERE, <API_KEY>, process.env.X)
//   - Template / example / docs files
//   - Files in .gitignore (checked via `git check-ignore`)
//   - Test fixture files

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);

// ── Read hook input ────────────────────────────────────────────────────────
let input;
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8');
  input = JSON.parse(raw);
} catch (_) { process.exit(0); }

if (!EDIT_TOOLS.has(input.tool_name)) process.exit(0);

// ── Extract content being written ─────────────────────────────────────────
const ti = input.tool_input ?? {};
let content = '';
if (input.tool_name === 'Write') {
  content = ti.content ?? '';
} else if (input.tool_name === 'Edit') {
  content = ti.new_string ?? '';
} else if (input.tool_name === 'MultiEdit') {
  content = (ti.edits ?? []).map(e => e.new_string ?? '').join('\n');
}
if (!content) process.exit(0);

// ── Skip safe file types ───────────────────────────────────────────────────
const filePath = ti.file_path ?? ti.path ?? '';
const base     = path.basename(filePath);

const SAFE_FILE_RE = [
  /\.template\./i,
  /\.example\./i,
  /\.sample\./i,
  /^\.env\.example$/i,
  /^\.env\.template$/i,
  /(^|\/)docs\//,
  /(^|\/)fixtures?\//,
  /(^|\/)__fixtures__\//,
  /(^|\/)test(s)?\//,
  /(^|\/)__tests__\//,
  /\.(md|txt|rst)$/,
];
if (SAFE_FILE_RE.some(re => re.test(filePath) || re.test(base))) process.exit(0);

// ── Check if file is git-ignored ───────────────────────────────────────────
function git(...args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r;
}

if (filePath) {
  const ignored = git('check-ignore', '-q', filePath);
  if (ignored.status === 0) process.exit(0); // file is gitignored → safe
}

// ── Secret patterns ────────────────────────────────────────────────────────
const PATTERNS = [
  { name: 'Anthropic API key',   re: /sk-ant-[a-zA-Z0-9\-_]{20,}/ },
  { name: 'OpenAI API key',      re: /sk-[a-zA-Z0-9]{48}/ },
  { name: 'AWS access key ID',   re: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS secret key',      re: /aws[_-]?secret[_-]?(?:access[_-]?)?key["']?\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}/i },
  { name: 'GitHub token',        re: /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/ },
  { name: 'GitLab token',        re: /glpat-[A-Za-z0-9\-_]{20}/ },
  { name: 'Stripe secret key',   re: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/ },
  { name: 'Slack webhook URL',   re: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+/ },
  { name: 'Private key block',   re: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: 'Database URL with password', re: /(?:mongodb|postgres|postgresql|mysql|redis|amqp):\/\/[^:@\s]+:[^@\s]{4,}@/ },
  { name: 'hardcoded password',  re: /(?<![a-zA-Z])(?:password|passwd|pwd)\s*[:=]\s*["'][^"'${}\s]{6,}["']/i },
  { name: 'hardcoded API key',   re: /(?:api[_-]?key|api[_-]?secret|app[_-]?secret)\s*[:=]\s*["'][^"'${}\s]{8,}["']/i },
  { name: 'hardcoded auth token',re: /(?:auth[_-]?token|access[_-]?token|bearer[_-]?token)\s*[:=]\s*["'][^"'${}\s]{10,}["']/i },
  { name: 'SendGrid API key',    re: /SG\.[A-Za-z0-9\-_.]{22,}\.[A-Za-z0-9\-_.]{43,}/ },
  { name: 'Twilio credentials',  re: /AC[a-z0-9]{32}/ },
];

// Patterns that indicate the value is a placeholder, not a real secret
const PLACEHOLDER_RE = /YOUR_|<[A-Z_]+>|REPLACE_ME|CHANGE_ME|INSERT_|process\.env|getenv\(|os\.environ|System\.getenv|\$\{|{{.*}}|__.*__|example|placeholder|dummy|fake|test|mock/i;

// ── Scan content line by line ──────────────────────────────────────────────
const hits = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Skip comment lines
  if (/^\s*(#|\/\/|\/\*|\*|<!--)/.test(line)) continue;

  for (const { name, re } of PATTERNS) {
    const m = line.match(re);
    if (!m) continue;
    if (PLACEHOLDER_RE.test(m[0])) continue;      // it's a placeholder
    if (PLACEHOLDER_RE.test(line)) continue;        // line context is a placeholder
    hits.push({ name, line: i + 1, snippet: line.trim().slice(0, 80) });
    break; // one hit per line
  }
}

if (hits.length === 0) process.exit(0);

// ── Block ──────────────────────────────────────────────────────────────────
const L = [];
L.push(`Potential secret(s) detected in ${filePath || 'file being written'}.`);
L.push(``);
hits.forEach(h => {
  L.push(`  Line ${h.line}: ${h.name}`);
  L.push(`    ${h.snippet}`);
});
L.push(``);
L.push(`Do NOT write real credentials into tracked files. Instead:`);
L.push(`  - Use environment variables:  process.env.API_KEY`);
L.push(`  - Use a .env file (add to .gitignore)`);
L.push(`  - Use placeholder values in templates: YOUR_API_KEY_HERE`);
L.push(``);
L.push(`If this is a false positive (placeholder, example, or test fixture),`);
L.push(`move the file to a safe path (*.template.*, docs/, fixtures/) or add`);
L.push(`it to .gitignore before proceeding.`);

process.stdout.write(JSON.stringify({ decision: 'block', reason: L.join('\n') }));

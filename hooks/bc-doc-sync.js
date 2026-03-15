#!/usr/bin/env node
// bc-doc-sync — Global Stop hook
//
// After Claude finishes responding, checks whether non-documentation files
// have uncommitted changes. If so, blocks and asks Claude to:
//
//   1. Update CLAUDE.md if architecture/conventions changed
//   2. Update README.md if user-facing behaviour changed
//   3. For each changed API/source file → create or update docs/<Name>.md
//      with: overview, low-level implementation details, interface, and a
//      release note entry (MR URL, title, short description, breaking changes)
//   4. Commit and push everything
//
// "Allow through" condition: any file in docs/ OR CLAUDE.md was updated
// in this pass → assume Claude handled it → stop blocking.
//
// Only activates in git repos that have a CLAUDE.md at root.

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ── Helpers ────────────────────────────────────────────────────────────────
function git(...args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

// ── Must be in a git repo with CLAUDE.md ──────────────────────────────────
const gitRoot = git('rev-parse', '--show-toplevel');
if (!gitRoot) process.exit(0);
if (!fs.existsSync(path.join(gitRoot, 'CLAUDE.md'))) process.exit(0);

// ── Collect all uncommitted changes ───────────────────────────────────────
const staged    = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
const unstaged  = git('diff', '--name-only').split('\n').filter(Boolean);
const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);

const allChanged = [...new Set([...staged, ...unstaged, ...untracked])];
if (allChanged.length === 0) process.exit(0);

// ── File classifiers ───────────────────────────────────────────────────────
const GLOBAL_IGNORE = [
  /^\.planning\//,
  /node_modules\//,
  /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/,
  /\.(log|cache|tmp|map|snap)$/,
  /^(dist|build|out|\.next|\.nuxt)\//,
];
function isIgnored(f) { return GLOBAL_IGNORE.some(re => re.test(f)); }

// "Top-level docs" — the files we always review
const TOP_DOCS = new Set(['CLAUDE.md', 'README.md']);

// Files inside docs/ directory
function isDocsFile(f) { return f.startsWith('docs/'); }

// API / source files worth documenting
const API_EXT      = /\.(js|jsx|ts|tsx|py|go|rb|rs|java|kt|swift|c|cpp|cs|php)$/;
const SKIP_API     = [
  /\.(test|spec)\.[jt]sx?$/,
  /(^|\/)(__tests__|tests?|__mocks__|fixtures?)\//,
  /\.(config|setup|env)\.[jt]sx?$/,
  /node_modules\//,
  /^(dist|build|out)\//,
  /^\.planning\//,
];
function isApiFile(f) {
  return API_EXT.test(f) && !SKIP_API.some(re => re.test(f)) && !isIgnored(f);
}

// Derive the docs/<Name>.md path for a source file.
// Strips common top-level dirs, replaces path separators with dashes.
function apiDocPath(filePath) {
  const stripped = filePath
    .replace(/^(src|lib|bin|api|app|pkg|cmd|internal|services|controllers|models|routes|handlers|utils|helpers)\//i, '');
  const noExt = stripped.replace(/\.[^.]+$/, '');
  const name  = noExt.replace(/\//g, '-');
  return `docs/${name}.md`;
}

// ── Classify changed files ─────────────────────────────────────────────────
const topDocChanged  = allChanged.filter(f => TOP_DOCS.has(path.basename(f)));
const docsChanged    = allChanged.filter(f => isDocsFile(f));
const nonDocChanged  = allChanged.filter(f =>
  !TOP_DOCS.has(path.basename(f)) && !isDocsFile(f) && !isIgnored(f)
);

if (nonDocChanged.length === 0) process.exit(0);

// If any doc (top-level or docs/) was updated this pass → allow through
if (topDocChanged.length > 0 || docsChanged.length > 0) process.exit(0);

// ── Gather context for the blocking message ────────────────────────────────
const remoteUrl   = git('remote', 'get-url', 'origin');
const branch      = git('branch', '--show-current');
const commitShort = git('rev-parse', '--short', 'HEAD');
const today       = new Date().toISOString().slice(0, 10);

// Construct a draft MR/PR link
let mrUrl = '(create PR/MR after push to get the URL)';
try {
  if (remoteUrl.includes('github.com')) {
    const m = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
    if (m) mrUrl = `https://github.com/${m[1]}/compare/${branch}`;
  } else if (remoteUrl.includes('gitlab')) {
    const m = remoteUrl.match(/gitlab[^/]*[:/](.+?)(?:\.git)?$/);
    if (m) mrUrl = `https://gitlab.com/${m[1]}/-/merge_requests/new?merge_request[source_branch]=${branch}`;
  }
} catch (_) {}

// Diff stat for changed source files
const diffStat = git('diff', '--stat')
  || git('diff', '--cached', '--stat')
  || '(no diff stat available)';

// ── Build per-API-file task list ───────────────────────────────────────────
const apiFiles = nonDocChanged.filter(isApiFile);
const apiTasks = apiFiles.map(f => {
  const docPath   = apiDocPath(f);
  const docExists = fs.existsSync(path.join(gitRoot, docPath));
  return { sourceFile: f, docPath, docExists };
});

// Non-API non-doc files (config, shell scripts, etc.)
const otherChanged = nonDocChanged.filter(f => !isApiFile(f));

// ── Build the blocking message ─────────────────────────────────────────────
const lines = [];

lines.push(`Uncommitted changes need documentation sync before finishing.`);
lines.push(``);

// ── Changed files overview
lines.push(`Changed files:`);
nonDocChanged.forEach(f => lines.push(`  ${f}`));
lines.push(``);

lines.push(`Diff summary:`);
diffStat.split('\n').slice(0, 12).forEach(l => lines.push(`  ${l}`));
lines.push(``);

// ── Step 1: CLAUDE.md
lines.push(`── Step 1: CLAUDE.md ─────────────────────────────────────────`);
lines.push(`Review CLAUDE.md and update it if any of the following changed:`);
lines.push(`  - Architecture or data flow`);
lines.push(`  - New/removed files with significant roles`);
lines.push(`  - Conventions, naming patterns, or key decisions`);
lines.push(`  - Constraints (tech stack, no-dependency rules, etc.)`);
lines.push(``);

// ── Step 2: README.md
lines.push(`── Step 2: README.md ─────────────────────────────────────────`);
lines.push(`Review README.md and update it if any of the following changed:`);
lines.push(`  - Install steps or prerequisites`);
lines.push(`  - Feature list or CLI/API surface`);
lines.push(`  - Usage examples or configuration`);
lines.push(``);

// ── Step 3: Per-API docs
if (apiTasks.length > 0) {
  lines.push(`── Step 3: API Documentation ─────────────────────────────────`);
  lines.push(`For each changed source file, create or update its docs/ file.`);
  lines.push(``);

  for (const { sourceFile, docPath, docExists } of apiTasks) {
    lines.push(`  ${docExists ? 'UPDATE' : 'CREATE'}: ${docPath}  (for ${sourceFile})`);
  }
  lines.push(``);

  lines.push(`Each docs/<Name>.md must follow this structure:`);
  lines.push(``);
  lines.push(`  # <API / Module Name>`);
  lines.push(``);
  lines.push(`  ## Overview`);
  lines.push(`  What this module/file does — its responsibility and purpose.`);
  lines.push(``);
  lines.push(`  ## How It Works`);
  lines.push(`  Low-level implementation details:`);
  lines.push(`  - Key algorithms, patterns, or data structures used`);
  lines.push(`  - Step-by-step data flow through the module`);
  lines.push(`  - Important edge cases handled internally`);
  lines.push(`  - Non-obvious decisions made in the implementation`);
  lines.push(``);
  lines.push(`  ## Interface`);
  lines.push(`  Exported functions/classes/constants with signatures and purpose.`);
  lines.push(`  One entry per export. Include parameter types and return values.`);
  lines.push(``);
  lines.push(`  ## Configuration`);
  lines.push(`  Environment variables, config keys, or options this module reads.`);
  lines.push(`  (Omit section if none.)`);
  lines.push(``);
  lines.push(`  ## Dependencies`);
  lines.push(`  Other modules/files this one imports and what it uses them for.`);
  lines.push(`  (Omit section if trivial.)`);
  lines.push(``);
  lines.push(`  ## Release Notes`);
  lines.push(``);
  lines.push(`  ### ${today}`);
  lines.push(`  - **MR:** [<short title of this change>](${mrUrl})`);
  lines.push(`  - **Summary:** <1–2 sentence description of what changed in this file>`);
  lines.push(`  - **Breaking Changes:** <describe any backward-incompatible changes, or "None">`);
  lines.push(``);
  lines.push(`  Rules for Release Notes:`);
  lines.push(`  - One entry per meaningful change event (this commit / PR)`);
  lines.push(`  - Breaking change = removed export, changed signature, changed behaviour`);
  lines.push(`    that callers relied on, or changed config key`);
  lines.push(`  - If the doc file already exists, ADD a new entry at the top of`);
  lines.push(`    Release Notes — do not overwrite existing entries`);
  lines.push(``);
}

if (otherChanged.length > 0) {
  lines.push(`── Other changed files (review for doc impact) ────────────────`);
  otherChanged.forEach(f => lines.push(`  ${f}`));
  lines.push(`Review whether any of these affect CLAUDE.md or README.md.`);
  lines.push(``);
}

// ── Step 4: Commit + push
lines.push(`── Step 4: Commit and push ───────────────────────────────────`);
lines.push(`After updating all relevant docs:`);
lines.push(`  git add -A && git commit -m "docs: sync CLAUDE.md, README.md, API docs" && git push`);
lines.push(``);
lines.push(`Branch: ${branch}  |  Ref: ${commitShort}  |  Remote: ${remoteUrl}`);

process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: lines.join('\n'),
}));

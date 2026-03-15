#!/usr/bin/env node
// bc-doc-sync — Global Stop hook
//
// After Claude finishes responding, checks whether non-documentation files
// have uncommitted changes while CLAUDE.md / README.md were not updated.
// If so, blocks Claude from stopping and asks it to:
//   1. Review whether CLAUDE.md and README.md need updating
//   2. Update them if they do
//   3. Commit and push all changes
//
// Only activates in git repos that have a CLAUDE.md at the root.
// Ignores: .planning/, node_modules/, lock files, build artifacts.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function git(...args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

// ── Must be in a git repo ──────────────────────────────────────────────────
const gitRoot = git('rev-parse', '--show-toplevel');
if (!gitRoot) process.exit(0);

// ── Only act in repos that have a CLAUDE.md ───────────────────────────────
if (!fs.existsSync(path.join(gitRoot, 'CLAUDE.md'))) process.exit(0);

// ── Collect all uncommitted changes ───────────────────────────────────────
const staged    = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
const unstaged  = git('diff', '--name-only').split('\n').filter(Boolean);
const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);

const allChanged = [...new Set([...staged, ...unstaged, ...untracked])];
if (allChanged.length === 0) process.exit(0);

// ── Classify files ─────────────────────────────────────────────────────────
const DOC_FILES = new Set(['CLAUDE.md', 'README.md']);

// Patterns to ignore — planning docs, lock files, build artifacts, caches
const IGNORE_PATTERNS = [
  /^\.planning\//,
  /node_modules\//,
  /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/,
  /\.(log|cache|tmp|map)$/,
  /^(dist|build|out|\.next|\.nuxt)\//,
];

function isIgnored(f) {
  return IGNORE_PATTERNS.some(re => re.test(f));
}

const docChanged    = allChanged.filter(f => DOC_FILES.has(path.basename(f)));
const nonDocChanged = allChanged.filter(f => !DOC_FILES.has(path.basename(f)) && !isIgnored(f));

// Nothing relevant changed — let Claude stop
if (nonDocChanged.length === 0) process.exit(0);

// Non-doc files changed but docs were also updated → all good
if (docChanged.length > 0) process.exit(0);

// ── Block and ask Claude to sync docs ─────────────────────────────────────
const preview = nonDocChanged.slice(0, 6).join(', ')
  + (nonDocChanged.length > 6 ? ` (+${nonDocChanged.length - 6} more)` : '');

process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: [
    `Uncommitted changes detected: ${preview}.`,
    `Before finishing, please:`,
    `1. Review whether CLAUDE.md needs updating (architecture, conventions, new files, changed behaviour).`,
    `2. Review whether README.md needs updating (install steps, feature list, usage docs).`,
    `3. Update whichever files need changes — skip if they are already accurate.`,
    `4. Commit all changes (docs + code) and push.`,
  ].join('\n'),
}));

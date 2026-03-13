'use strict';

const { spawnSync } = require('child_process');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

const COST_CACHE      = path.join(os.tmpdir(), 'brocode-monthly-cost.json');
const COST_CACHE_TTL  = 5 * 60 * 1000; // 5 minutes

const GIT_EXPANDED_FILE     = path.join(os.tmpdir(), 'brocode-git-expanded');
const GIT_TOGGLE_CMD        = path.join(os.tmpdir(), 'brocode-git-toggle.command');

const SESSION_FILE          = path.join(os.tmpdir(), 'brocode-session.json');
const SESSION_EXPANDED_FILE = path.join(os.tmpdir(), 'brocode-session-expanded');
const SESSION_TOGGLE_CMD    = path.join(os.tmpdir(), 'brocode-session-toggle.command');

// ─── Git ──────────────────────────────────────────────────────────────────────

/**
 * Returns the current git branch name, or null if not in a repo.
 * @param {string} cwd
 * @returns {string | null}
 */
function getGitBranch(cwd = process.cwd()) {
  const result = spawnSync('git', ['branch', '--show-current'], {
    cwd, encoding: 'utf8', timeout: 2000,
  });
  if (result.status === 0) return result.stdout.trim() || null;
  return null;
}

/**
 * Returns counts of uncommitted file changes using `git status --porcelain`.
 * Returns null when the tree is clean or not a git repo.
 *
 * @param {string} cwd
 * @returns {{ added: number, modified: number, deleted: number } | null}
 */
function getGitChanges(cwd = process.cwd()) {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd, encoding: 'utf8', timeout: 2000,
  });
  if (result.status !== 0 || !result.stdout.trim()) return null;

  let added = 0, modified = 0, deleted = 0;
  for (const line of result.stdout.split('\n').filter(Boolean)) {
    const x = line[0];
    const y = line[1];
    if (x === '?' || x === 'A')                              { added++;    continue; }
    if (x === 'D' || y === 'D')                              { deleted++;  continue; }
    if (x === 'M' || y === 'M' || x === 'R' || x === 'C')   { modified++; continue; }
  }

  if (added + modified + deleted === 0) return null;
  return { added, modified, deleted };
}

/**
 * Returns the full file list from `git status --porcelain`, grouped and
 * annotated with display symbols. Used when the status bar is expanded.
 *
 * @param {string} cwd
 * @returns {Array<{ symbol: string, file: string }> | null}
 */
function getGitFiles(cwd = process.cwd()) {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd, encoding: 'utf8', timeout: 2000,
  });
  if (result.status !== 0 || !result.stdout.trim()) return null;

  const modified = [], added = [], deleted = [], untracked = [];

  for (const line of result.stdout.split('\n').filter(Boolean)) {
    const x    = line[0];
    const y    = line[1];
    const file = line.slice(3);
    if (x === '?')                                           { untracked.push(file); continue; }
    if (x === 'A')                                           { added.push(file);     continue; }
    if (x === 'D' || y === 'D')                              { deleted.push(file);   continue; }
    if (x === 'M' || y === 'M' || x === 'R' || x === 'C')   { modified.push(file);  continue; }
  }

  return [
    ...modified.map(f  => ({ symbol: 'M', file: f })),
    ...added.map(f     => ({ symbol: 'A', file: f })),
    ...deleted.map(f   => ({ symbol: 'D', file: f })),
    ...untracked.map(f => ({ symbol: '?', file: f })),
  ];
}

// ─── Git expansion toggle ─────────────────────────────────────────────────────

/**
 * Returns true if the user has toggled the git file list open.
 * @returns {boolean}
 */
function isGitExpanded() {
  return fs.existsSync(GIT_EXPANDED_FILE);
}

/**
 * Writes (or refreshes) the git toggle .command script to /tmp.
 * @returns {string}  Absolute path to the .command file
 */
function ensureGitToggleCommand() {
  const script = [
    '#!/bin/bash',
    `TOGGLE="${GIT_EXPANDED_FILE}"`,
    '[ -f "$TOGGLE" ] && rm -f "$TOGGLE" || touch "$TOGGLE"',
    'osascript -e \'tell application "Terminal" to close front window\' 2>/dev/null || true',
    'osascript -e \'tell application "iTerm2" to close current session\' 2>/dev/null || true',
    'exit 0',
  ].join('\n') + '\n';

  fs.writeFileSync(GIT_TOGGLE_CMD, script, { mode: 0o755 });
  return GIT_TOGGLE_CMD;
}

// ─── Session state ────────────────────────────────────────────────────────────

/**
 * Writes the initial session state to SESSION_FILE.
 * Records the current git HEAD as a checkpoint reference.
 * Called once by brocode.js on launch, before spawning claude.
 *
 * @param {string} cwd
 */
function initSessionState(cwd) {
  let checkpointSha = null;
  try {
    const r = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd, encoding: 'utf8', timeout: 2000,
    });
    if (r.status === 0) checkpointSha = r.stdout.trim();
  } catch {}

  const state = {
    startTime:     Date.now(),
    checkpointSha,
    checkpointCwd: cwd,
    files:         [],
    toolCalls:     0,
  };

  try { fs.writeFileSync(SESSION_FILE, JSON.stringify(state)); } catch {}
}

/**
 * Reads the current session state from SESSION_FILE.
 * Returns a safe default when the file is absent or unreadable.
 *
 * @returns {{ files: string[], toolCalls: number, startTime: number, checkpointSha: string|null }}
 */
function getSessionData() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  } catch {
    return { files: [], toolCalls: 0, startTime: Date.now(), checkpointSha: null };
  }
}

/**
 * Returns true if the user has toggled the session file list open.
 * @returns {boolean}
 */
function isSessionExpanded() {
  return fs.existsSync(SESSION_EXPANDED_FILE);
}

/**
 * Writes (or refreshes) the session toggle .command script to /tmp.
 * Same mechanism as git toggle — clicking the OSC 8 link opens/closes
 * the session files inline in the status bar.
 *
 * @returns {string}  Absolute path to the .command file
 */
function ensureSessionToggleCommand() {
  const script = [
    '#!/bin/bash',
    `TOGGLE="${SESSION_EXPANDED_FILE}"`,
    '[ -f "$TOGGLE" ] && rm -f "$TOGGLE" || touch "$TOGGLE"',
    'osascript -e \'tell application "Terminal" to close front window\' 2>/dev/null || true',
    'osascript -e \'tell application "iTerm2" to close current session\' 2>/dev/null || true',
    'exit 0',
  ].join('\n') + '\n';

  fs.writeFileSync(SESSION_TOGGLE_CMD, script, { mode: 0o755 });
  return SESSION_TOGGLE_CMD;
}

// ─── Session JSONL ────────────────────────────────────────────────────────────

/**
 * Returns a short display name for a Claude Code tool.
 *   "Bash"                      → "Bash"
 *   "mcp__ide__getDiagnostics"  → "MCP:ide"
 *
 * @param {string} name
 * @returns {string}
 */
function formatToolName(name) {
  const mcp = name.match(/^mcp__(\w+)__/);
  if (mcp) return `MCP:${mcp[1]}`;
  return name;
}

/**
 * Scans the session JSONL from the end and returns the most recently called
 * tool name, or null if none found.
 *
 * @param {string | null} transcriptPath
 * @returns {string | null}
 */
function getActiveTool(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const obj = JSON.parse(lines[i]);
        if (obj?.type !== 'assistant') continue;
        const content = obj?.message?.content;
        if (!Array.isArray(content)) continue;
        for (const block of content) {
          if (block.type === 'tool_use' && block.name) return formatToolName(block.name);
        }
      } catch { /* skip malformed lines */ }
    }
  } catch { /* file unreadable */ }
  return null;
}

// ─── Anthropic Cost Report API ────────────────────────────────────────────────

/**
 * Minimal HTTPS GET — returns parsed JSON or rejects.
 * @param {string} url
 * @param {object} headers
 * @returns {Promise<object>}
 */
function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    https.get({ hostname, path: pathname + search, headers }, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('Invalid JSON from cost API')); }
      });
    }).on('error', reject);
  });
}

/**
 * Fetches the month-to-date cost from Anthropic's Cost Report API.
 * Requires ANTHROPIC_ADMIN_API_KEY (Admin key, not a regular API key).
 * Results are cached in /tmp for COST_CACHE_TTL ms to limit API calls.
 *
 * @returns {Promise<number | null>} Total USD cost this month, or null on failure
 */
async function fetchMonthlyCost() {
  try {
    const cache = JSON.parse(fs.readFileSync(COST_CACHE, 'utf8'));
    if (Date.now() - cache.fetchedAt < COST_CACHE_TTL) return cache.cost;
  } catch { /* cache miss */ }

  const adminKey = process.env.ANTHROPIC_ADMIN_API_KEY;
  if (!adminKey) return null;

  const now        = new Date();
  const startingAt = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endingAt   = now.toISOString();
  const url        = 'https://api.anthropic.com/v1/organizations/cost_report' +
                     `?starting_at=${startingAt}&ending_at=${endingAt}&bucket_width=1d`;

  try {
    const body = await httpsGet(url, {
      'x-api-key':         adminKey,
      'anthropic-version': '2023-06-01',
    });

    let total = 0;
    for (const bucket of body.data ?? []) {
      for (const row of bucket.results ?? []) {
        total += parseFloat(row.amount) || 0;
      }
    }

    fs.writeFileSync(COST_CACHE, JSON.stringify({ cost: total, fetchedAt: Date.now() }));
    return total;
  } catch {
    return null;
  }
}

module.exports = {
  getGitBranch,
  getGitChanges,
  getGitFiles,
  isGitExpanded,
  ensureGitToggleCommand,
  initSessionState,
  getSessionData,
  isSessionExpanded,
  ensureSessionToggleCommand,
  getActiveTool,
  fetchMonthlyCost,
};

'use strict';

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

/**
 * Claude pricing per token (Sonnet 4.6).
 * Update these if Anthropic changes rates.
 * @see https://www.anthropic.com/pricing
 */
const PRICE = {
  input:        3.00 / 1_000_000,
  output:      15.00 / 1_000_000,
  cacheCreate:  3.75 / 1_000_000,
  cacheRead:    0.30 / 1_000_000,
};

/**
 * Returns the current git branch name, or null if not in a repo.
 * @param {string} cwd - Directory to check (defaults to process.cwd())
 * @returns {string | null}
 */
function getGitBranch(cwd = process.cwd()) {
  const result = spawnSync('git', ['branch', '--show-current'], {
    cwd,
    encoding: 'utf8',
    timeout:  2000,
  });
  if (result.status === 0) return result.stdout.trim() || null;
  return null;
}

/**
 * Converts a filesystem path to the key Claude Code uses for its project dir.
 * Claude Code replaces every "/" with "-" and keeps the leading "-".
 * e.g. /Users/foo/bar  →  -Users-foo-bar
 * @param {string} cwd
 * @returns {string}
 */
function toProjectKey(cwd) {
  return cwd.replace(/\//g, '-');
}

/**
 * Returns the path to Claude Code's session directory for the given cwd.
 * @param {string} cwd
 * @returns {string}
 */
function getClaudeProjectDir(cwd = process.cwd()) {
  return path.join(os.homedir(), '.claude', 'projects', toProjectKey(cwd));
}

/**
 * Reads a session JSONL file and sums the total cost across all messages.
 * @param {string} sessionFile - Absolute path to a .jsonl session file
 * @returns {number} Total estimated cost in USD
 */
function parseSessionCost(sessionFile) {
  try {
    const lines = fs.readFileSync(sessionFile, 'utf8').split('\n').filter(Boolean);
    let input = 0, output = 0, cacheCreate = 0, cacheRead = 0;

    for (const line of lines) {
      try {
        const u = JSON.parse(line)?.message?.usage;
        if (!u) continue;
        input       += u.input_tokens                || 0;
        output      += u.output_tokens               || 0;
        cacheCreate += u.cache_creation_input_tokens || 0;
        cacheRead   += u.cache_read_input_tokens     || 0;
      } catch { /* skip malformed lines */ }
    }

    return calcCost({ input, output, cacheCreate, cacheRead });
  } catch {
    return 0;
  }
}

/**
 * Sums the cost of all sessions for the current project today.
 * @param {string} cwd
 * @returns {number | null} Total cost in USD, or null if no sessions exist today
 */
function getTodayCost(cwd = process.cwd()) {
  const projectDir = getClaudeProjectDir(cwd);
  if (!fs.existsSync(projectDir)) return null;

  const todayStr = new Date().toDateString();
  let total = 0;
  let found = false;

  try {
    for (const file of fs.readdirSync(projectDir)) {
      if (!file.endsWith('.jsonl')) continue;
      const filePath = path.join(projectDir, file);
      if (new Date(fs.statSync(filePath).mtimeMs).toDateString() !== todayStr) continue;
      total += parseSessionCost(filePath);
      found = true;
    }
  } catch { /* directory read error — treat as no data */ }

  return found ? total : null;
}

/**
 * Reads the model ID from the most recent session in the current project.
 * Falls back to the ANTHROPIC_MODEL env var, then null.
 * @param {string} cwd
 * @returns {string | null} e.g. "claude-sonnet-4-6"
 */
function getLastUsedModel(cwd = process.cwd()) {
  // Env var takes precedence (user has explicitly set it)
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;

  const projectDir = getClaudeProjectDir(cwd);
  if (!fs.existsSync(projectDir)) return null;

  try {
    // Sort by modification time, newest first
    const files = fs.readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const p = path.join(projectDir, f);
        return { path: p, mtime: fs.statSync(p).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    for (const { path: filePath } of files) {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
      // Scan from the end — the last assistant message has the model id
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const model = JSON.parse(lines[i])?.message?.model;
          // Ignore synthetic/tool-use model values — only real Claude model IDs
          if (model && model.startsWith('claude-')) return model;
        } catch { /* skip */ }
      }
    }
  } catch { /* unreadable — treat as unknown */ }

  return null;
}

/**
 * Calculates estimated USD cost from raw token counts.
 * @param {{ input?: number, output?: number, cacheCreate?: number, cacheRead?: number }} tokens
 * @returns {number}
 */
function calcCost({ input = 0, output = 0, cacheCreate = 0, cacheRead = 0 }) {
  return (
    input       * PRICE.input +
    output      * PRICE.output +
    cacheCreate * PRICE.cacheCreate +
    cacheRead   * PRICE.cacheRead
  );
}

module.exports = { getGitBranch, getTodayCost, getLastUsedModel, calcCost };

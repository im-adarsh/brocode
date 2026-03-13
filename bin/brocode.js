#!/usr/bin/env node
'use strict';

/**
 * brocode — the main entry point.
 *
 * On every launch:
 *   1. Writes statusLine config to ~/.claude/settings.json (once)
 *   2. Registers PostToolUse and Stop hooks (once)
 *   3. Initialises the session state file (every launch)
 *   4. Spawns `claude`, forwarding all arguments unchanged
 */

const { spawn }         = require('child_process');
const { initSessionState } = require('../src/metrics');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const CLAUDE_SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

/**
 * Writes the brocode-status command into ~/.claude/settings.json so that
 * Claude Code's status bar is driven by our script.
 * No-ops if the statusLine key is already present.
 */
function ensureStatusLine(settings) {
  if (settings.statusLine) return settings;
  settings.statusLine = { type: 'command', command: 'brocode-status' };
  return settings;
}

/**
 * Registers brocode's PostToolUse and Stop hooks in ~/.claude/settings.json.
 * No-ops if the hooks are already present.
 * Hooks are idempotent — safe to call on every launch.
 */
function ensureHooks(settings) {
  settings.hooks = settings.hooks || {};

  // ── PostToolUse: track every tool call + file edits ──────────────────────
  const postHooks = settings.hooks.PostToolUse || [];
  const hasToolHook = postHooks.some(
    h => (h.hooks || []).some(c => c.command === 'brocode-hook-tool'),
  );
  if (!hasToolHook) {
    postHooks.push({
      hooks: [{ type: 'command', command: 'brocode-hook-tool' }],
    });
    settings.hooks.PostToolUse = postHooks;
  }

  // ── Stop: archive session when Claude Code exits ──────────────────────────
  const stopHooks = settings.hooks.Stop || [];
  const hasStopHook = stopHooks.some(
    h => (h.hooks || []).some(c => c.command === 'brocode-hook-stop'),
  );
  if (!hasStopHook) {
    stopHooks.push({
      hooks: [{ type: 'command', command: 'brocode-hook-stop' }],
    });
    settings.hooks.Stop = stopHooks;
  }

  return settings;
}

function main() {
  // Read current settings (may not exist yet)
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS, 'utf8'));
  } catch { /* file missing or unreadable */ }

  // Apply configuration (idempotent)
  try {
    settings = ensureStatusLine(settings);
    settings = ensureHooks(settings);
    fs.mkdirSync(path.dirname(CLAUDE_SETTINGS), { recursive: true });
    fs.writeFileSync(CLAUDE_SETTINGS, JSON.stringify(settings, null, 2) + '\n');
  } catch { /* non-fatal */ }

  // Initialise session state (records git HEAD, resets file/call counters)
  try { initSessionState(process.cwd()); } catch { /* non-fatal */ }

  // Hand off to claude, forwarding all arguments as-is
  const child = spawn('claude', process.argv.slice(2), { stdio: 'inherit' });
  child.on('exit', code => process.exit(code ?? 0));
}

main();

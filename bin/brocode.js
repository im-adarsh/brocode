#!/usr/bin/env node
'use strict';

/**
 * brocode — the main entry point.
 *
 * Displays a welcome box with branch, model, and today's usage, then
 * configures Claude Code's status bar and launches `claude`, forwarding
 * every argument unchanged.
 */

const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const { getGitBranch, getTodayCost, getLastUsedModel } = require('../src/metrics');
const { renderWelcomeBox }                             = require('../src/render');

const CLAUDE_SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

/**
 * Writes the brocode-status command into ~/.claude/settings.json so that
 * Claude Code's status bar is driven by our script.
 * No-ops if the statusLine key is already present.
 */
function ensureStatusLine() {
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS, 'utf8'));
  } catch { /* file missing or unreadable — start from an empty object */ }

  if (settings.statusLine) return; // already configured, leave it alone

  settings.statusLine = { type: 'command', command: 'brocode-status' };
  fs.writeFileSync(CLAUDE_SETTINGS, JSON.stringify(settings, null, 2) + '\n');
}

function main() {
  const branch    = getGitBranch();
  const model     = getLastUsedModel();
  const todayCost = getTodayCost();

  process.stdout.write('\n');
  process.stdout.write(renderWelcomeBox({ branch, model, todayCost }));
  process.stdout.write('\n\n');

  try { ensureStatusLine(); } catch { /* non-fatal — status bar stays unconfigured */ }

  // Hand off to claude, forwarding all arguments as-is
  const child = spawn('claude', process.argv.slice(2), { stdio: 'inherit' });
  child.on('exit', code => process.exit(code ?? 0));
}

main();

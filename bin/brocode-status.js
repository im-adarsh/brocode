#!/usr/bin/env node
'use strict';

/**
 * brocode-status — the Claude Code status line provider.
 *
 * Claude Code calls this script on every refresh, piping a JSON blob to stdin.
 *
 * Modes (checked in order):
 *   1. Session expanded — status bar + session files list (click ✎ N to toggle)
 *   2. Default         — cyan box + uncommitted git files below a separator
 *
 * stdin schema (supplied by Claude Code):
 * {
 *   cwd:             string,
 *   transcript_path: string,
 *   model:           { id: string, display_name: string },
 *   cost:            { total_cost_usd: number },
 *   context_window:  { used_percentage: number }
 * }
 */

const {
  getGitBranch,
  getGitChanges,
  getGitFiles,
  getSessionData,
  isSessionExpanded,
  ensureSessionToggleCommand,
  getActiveTool,
  fetchMonthlyCost,
  getTerminalWidth,
} = require('../src/metrics');

// Detect real terminal width and publish it before any render calls.
// stdout is piped when Claude Code calls us, so process.stdout.columns is
// undefined. getTerminalWidth() falls back to stty via /dev/tty.
process.env.COLUMNS = String(getTerminalWidth());

const { renderStatusLine, renderSessionExpanded } = require('../src/render');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', async () => {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const cwd            = data.cwd || process.cwd();
  const transcriptPath = data.transcript_path ?? null;
  const ctx            = data.context_window || {};

  const monthlyCost  = await fetchMonthlyCost();
  const sessionData  = getSessionData();

  // Sanity-check cost: Claude Code may send values in micro-dollars or
  // other units. A real session costs $0–$100. Discard anything outside
  // that range to avoid displaying garbage like "$78900session".
  const rawCost    = data.cost?.total_cost_usd ?? null;
  const sessionCost = (typeof rawCost === 'number' && rawCost >= 0 && rawCost <= 100)
    ? rawCost
    : null;

  const branch     = getGitBranch(cwd);
  const model      = data.model?.id ?? null;
  const activeTool = getActiveTool(transcriptPath);
  // Sanity-check context %: must be 0–100. Claude Code occasionally sends
  // values like 563 when data is in wrong units or corrupt.
  const rawPct  = ctx.used_percentage ?? null;
  const usedPct = (typeof rawPct === 'number' && rawPct >= 0 && rawPct <= 100)
    ? rawPct
    : null;
  const sessionToggleCmd = ensureSessionToggleCommand();
  const gitChanges       = getGitChanges(cwd);
  const gitFiles         = getGitFiles(cwd);

  const shared = {
    branch, model, activeTool, usedPct,
    monthlyCost, sessionCost,
    sessionFiles: sessionData.files,
    sessionToggleCmd,
    gitChanges,
    gitFiles,
  };

  if (isSessionExpanded()) {
    process.stdout.write(renderSessionExpanded(shared) + '\n');
  } else {
    process.stdout.write(renderStatusLine(shared) + '\n');
  }
});

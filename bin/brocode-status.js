#!/usr/bin/env node
'use strict';

/**
 * brocode-status — the Claude Code status line provider.
 *
 * Claude Code calls this script on every refresh, piping a JSON blob to stdin.
 *
 * Modes (checked in order):
 *   1. Git expanded   — status bar + git file list (click +A~M to toggle)
 *   2. Session expanded — status bar + session files list (click ✎ N to toggle)
 *   3. Collapsed      — normal full-width cyan box status bar
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
  isGitExpanded,
  ensureGitToggleCommand,
  getSessionData,
  isSessionExpanded,
  ensureSessionToggleCommand,
  getActiveTool,
  fetchMonthlyCost,
} = require('../src/metrics');

const { renderStatusLine, renderGitExpanded, renderSessionExpanded } = require('../src/render');

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

  const branch          = getGitBranch(cwd);
  const model           = data.model?.id ?? null;
  const activeTool      = getActiveTool(transcriptPath);
  // Sanity-check context %: must be 0–100. Claude Code occasionally sends
  // values like 563 when data is in wrong units or corrupt.
  const rawPct  = ctx.used_percentage ?? null;
  const usedPct = (typeof rawPct === 'number' && rawPct >= 0 && rawPct <= 100)
    ? rawPct
    : null;
  const gitToggleCmd    = ensureGitToggleCommand();
  const sessionToggleCmd = ensureSessionToggleCommand();

  const shared = {
    branch, model, activeTool, usedPct,
    monthlyCost, sessionCost,
    sessionFiles:   sessionData.files,
    gitToggleCmd,
    sessionToggleCmd,
  };

  if (isGitExpanded()) {
    const gitFiles = getGitFiles(cwd);
    process.stdout.write(renderGitExpanded({ ...shared, gitFiles }) + '\n');
  } else if (isSessionExpanded()) {
    process.stdout.write(renderSessionExpanded(shared) + '\n');
  } else {
    const gitChanges = getGitChanges(cwd);
    process.stdout.write(renderStatusLine({ ...shared, gitChanges }) + '\n');
  }
});

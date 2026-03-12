#!/usr/bin/env node
'use strict';

/**
 * brocode-status — the Claude Code status line provider.
 *
 * Claude Code calls this script on every refresh, piping a JSON blob to stdin.
 *
 * Collapsed (default):  prints one line — git changes are an OSC 8 link to
 *   the toggle .command script.  Clicking expands the file list.
 *
 * Expanded:  prints multiple lines — status bar + divider + file list.
 *   The ▲ in the status bar collapses it again.
 *
 * The expansion state lives in /tmp/brocode-git-expanded (presence = expanded).
 * The toggle is driven by /tmp/brocode-git-toggle.command (a macOS shell
 * script that flips the state file and closes its Terminal.app window).
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
  getActiveTool,
  fetchMonthlyCost,
} = require('../src/metrics');

const { renderStatusLine, renderGitExpanded } = require('../src/render');

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

  const monthlyCost = await fetchMonthlyCost();

  const branch     = getGitBranch(cwd);
  const model      = data.model?.id ?? null;
  const activeTool = getActiveTool(transcriptPath);
  const usedPct    = ctx.used_percentage ?? null;
  const toggleCmd  = ensureGitToggleCommand();

  const shared = { branch, model, activeTool, usedPct, monthlyCost, toggleCmd };

  if (isGitExpanded()) {
    const gitFiles = getGitFiles(cwd);
    process.stdout.write(renderGitExpanded({ ...shared, gitFiles }) + '\n');
  } else {
    const gitChanges = getGitChanges(cwd);
    process.stdout.write(renderStatusLine({ ...shared, gitChanges }) + '\n');
  }
});

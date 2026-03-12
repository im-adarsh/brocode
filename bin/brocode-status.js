#!/usr/bin/env node
'use strict';

/**
 * brocode-status — the Claude Code status line provider.
 *
 * Claude Code calls this script on every status refresh cycle, piping a JSON
 * context blob to stdin.  We read it, extract the model/context/branch info,
 * and print a single formatted line to stdout.
 *
 * stdin schema (supplied by Claude Code):
 * {
 *   cwd: string,
 *   model: { id: string, display_name: string },
 *   context_window: {
 *     total_input_tokens:  number,
 *     total_output_tokens: number,
 *     used_percentage:     number | null,
 *   },
 *   ...
 * }
 */

const { getGitBranch, calcCost } = require('../src/metrics');
const { renderStatusLine }       = require('../src/render');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    // Malformed input — output nothing so the status bar stays blank
    process.exit(0);
  }

  const cwd = data.cwd || process.cwd();
  const ctx = data.context_window || {};

  const branch    = getGitBranch(cwd);
  const model     = data.model?.id ?? null;
  const usedPct   = ctx.used_percentage ?? null;

  // Estimate session cost from the cumulative token counters Claude Code provides.
  // Cache token breakdown isn't available in the context_window summary, so we
  // use input/output pricing only — a conservative lower bound.
  const sessionCost = (ctx.total_input_tokens != null)
    ? calcCost({
        input:  ctx.total_input_tokens  || 0,
        output: ctx.total_output_tokens || 0,
      })
    : null;

  process.stdout.write(renderStatusLine({ branch, model, usedPct, sessionCost }) + '\n');
});

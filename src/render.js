'use strict';

// ─── ANSI helpers ────────────────────────────────────────────────────────────

const C = {
  reset:      '\x1b[0m',
  dim:        '\x1b[2m',
  red:        '\x1b[31m',
  green:      '\x1b[32m',
  yellow:     '\x1b[33m',
  cyan:       '\x1b[36m',
  magenta:    '\x1b[35m',
  white:      '\x1b[37m',
  brightWhite:'\x1b[97m',
  clearEol:   '\x1b[0K',
};

/**
 * Strips ANSI SGR codes and OSC 8 hyperlink sequences so we can measure
 * the visible (printed) width of a string.
 * @param {string} s
 * @returns {string}
 */
function stripAnsi(s) {
  return s
    .replace(/\x1b\[[0-9;]*m/g, '')           // CSI SGR colours / attributes
    .replace(/\x1b\[[0-9;]*[GKJHFnsu]/g, '')  // CSI cursor / erase
    .replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, '')  // OSC 8 link open
    .replace(/\x1b\]8;;\x1b\\/g, '');          // OSC 8 link close
}

/** Visible character count of a string that may contain ANSI codes. */
function visLen(s) {
  return [...stripAnsi(s)].length;
}

/**
 * Wraps text in an OSC 8 terminal hyperlink.
 * Clicking opens the URL in a supporting terminal (iTerm2, Warp, Kitty, etc.).
 * Falls back to plain text in terminals that don't support OSC 8.
 *
 * @param {string} url
 * @param {string} text  May contain ANSI codes
 * @returns {string}
 */
function osc8(url, text) {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

/**
 * Formats a USD cost value for display.
 * @param {number} cost
 * @returns {string}  e.g. "$0.83" or "<$0.01"
 */
function formatCost(cost) {
  if (cost < 0.001) return '<$0.01';
  if (cost < 0.01)  return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Shortens a full model ID to a human-readable display name.
 * "claude-sonnet-4-6"  →  "Sonnet 4.6"
 * Falls back to the raw ID if the pattern is unrecognised.
 * @param {string} modelId
 * @returns {string}
 */
function shortModelName(modelId) {
  const m = modelId.match(/claude-(\w+)-(\d+)-(\d+)/);
  if (!m) return modelId;
  const [, tier, major, minor] = m;
  return `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${major}.${minor}`;
}

// ─── Status line ──────────────────────────────────────────────────────────────

/**
 * Renders the collapsed status bar inside a single-row Unicode box.
 * Outputs 4 lines:
 *   line 0 — blank  (creates a gap so Claude Code's nudge text lands here,
 *             above the box, without overlapping the border)
 *   line 1 — ┌─────────────────────────────────────────────────────┐
 *   line 2 — │ ⎇ branch  ·  ◆ Model  ·  ⚡ Tool  ·  18% ctx  ·  $ │
 *   line 3 — └─────────────────────────────────────────────────────┘
 *
 * @param {object}        opts
 * @param {string|null}   opts.branch         Git branch name
 * @param {object|null}   opts.gitChanges      { added, modified, deleted } counts
 * @param {string|null}   opts.toggleCmd       Path to .command toggle script
 * @param {string|null}   opts.model           Active model ID
 * @param {string|null}   opts.activeTool      Most recently called tool name
 * @param {number|null}   opts.usedPct         Context window usage 0–100
 * @param {number|null}   opts.monthlyCost     Month-to-date cost in USD
 * @returns {string}
 */
function renderStatusLine({ branch, gitChanges, toggleCmd, model, activeTool, usedPct, monthlyCost }) {
  const SEP   = `  ${C.dim}·${C.reset}  `;
  const parts = [];

  // ── Branch + expand link ──────────────────────────────────────────────────
  if (branch) {
    let seg = `${C.green}⎇ ${branch}${C.reset}`;

    if (gitChanges) {
      const { added, modified, deleted } = gitChanges;
      const bits = [];
      if (added)    bits.push(`${C.green}+${added}${C.reset}`);
      if (modified) bits.push(`${C.yellow}~${modified}${C.reset}`);
      if (deleted)  bits.push(`${C.red}-${deleted}${C.reset}`);

      if (bits.length) {
        const label = bits.join('  ');
        seg += `  ${toggleCmd ? osc8(`file://${toggleCmd}`, label) : label}`;
      }
    }

    parts.push(seg);
  }

  // ── Model ─────────────────────────────────────────────────────────────────
  if (model) {
    parts.push(`${C.magenta}◆ ${shortModelName(model)}${C.reset}`);
  }

  // ── Active tool ───────────────────────────────────────────────────────────
  if (activeTool) {
    parts.push(`${C.cyan}⚡ ${activeTool}${C.reset}`);
  }

  // ── Context % ─────────────────────────────────────────────────────────────
  if (usedPct != null) {
    const color = usedPct >= 80 ? C.red : usedPct >= 60 ? C.yellow : C.green;
    parts.push(`${color}${Math.round(usedPct)}%${C.reset} ${C.dim}ctx${C.reset}`);
  }

  // ── Monthly cost ──────────────────────────────────────────────────────────
  if (monthlyCost != null) {
    parts.push(`${C.yellow}${formatCost(monthlyCost)}${C.reset} ${C.dim}month${C.reset}`);
  }

  // ── Box ───────────────────────────────────────────────────────────────────
  const W       = process.stdout.columns || 80;
  const inner   = W - 2;                   // width between the │ borders
  const content = parts.join(SEP);
  const pad     = Math.max(0, inner - visLen(content));

  const top = `${C.dim}┌${'─'.repeat(inner)}┐${C.reset}`;
  const mid = `${C.dim}│${C.reset}${content}${' '.repeat(pad)}${C.dim}│${C.reset}`;
  const bot = `${C.dim}└${'─'.repeat(inner)}┘${C.reset}`;

  // The leading blank line reserves a row for Claude Code's own nudge text
  // ("⏵⏵ accept edits on …") so it appears above the box, not on top of it.
  return `${C.clearEol}\n${top}${C.clearEol}\n${mid}${C.clearEol}\n${bot}${C.clearEol}`;
}

/**
 * Renders the expanded multi-line git file list shown below the status bar.
 * Line 0: the normal status bar with a ▲ collapse link instead of +A ~M -D.
 * Lines 1+: one line per changed file, grouped modified → added → deleted → untracked.
 *
 * @param {object}                          opts
 * @param {string|null}                     opts.branch
 * @param {Array<{symbol,file}>|null}       opts.gitFiles    From getGitFiles()
 * @param {string|null}                     opts.toggleCmd   Path to .command toggle script
 * @param {string|null}                     opts.model
 * @param {string|null}                     opts.activeTool
 * @param {number|null}                     opts.usedPct
 * @param {number|null}                     opts.monthlyCost
 * @returns {string}  Multi-line ANSI string (lines joined with \n)
 */
function renderGitExpanded({ branch, gitFiles, toggleCmd, model, activeTool, usedPct, monthlyCost }) {
  const SEP     = `  ${C.dim}·${C.reset}  `;
  const W       = process.stdout.columns || 80;
  const divider = `${C.dim}${'─'.repeat(W)}${C.reset}`;

  // ── Status line with collapse link ────────────────────────────────────────
  const parts = [];

  if (branch) {
    const collapseLabel = `${C.yellow}▲${C.reset}`;
    const collapseLink  = toggleCmd ? osc8(`file://${toggleCmd}`, collapseLabel) : collapseLabel;
    parts.push(`${C.green}⎇ ${branch}${C.reset}  ${collapseLink}`);
  }
  if (model)       parts.push(`${C.magenta}◆ ${shortModelName(model)}${C.reset}`);
  if (activeTool)  parts.push(`${C.cyan}⚡ ${activeTool}${C.reset}`);
  if (usedPct != null) {
    const color = usedPct >= 80 ? C.red : usedPct >= 60 ? C.yellow : C.green;
    parts.push(`${color}${Math.round(usedPct)}%${C.reset} ${C.dim}ctx${C.reset}`);
  }
  if (monthlyCost != null) {
    parts.push(`${C.yellow}${formatCost(monthlyCost)}${C.reset} ${C.dim}month${C.reset}`);
  }

  const lines = [ parts.join(SEP), divider ];

  // ── File list ─────────────────────────────────────────────────────────────
  const symbolColor = { M: C.yellow, A: C.green, D: C.red, '?': C.cyan };

  for (const { symbol, file } of gitFiles ?? []) {
    const col = symbolColor[symbol] ?? C.white;
    lines.push(`  ${col}${symbol}${C.reset}  ${C.white}${file}${C.reset}`);
  }

  lines.push(divider);
  return lines.map(l => l + C.clearEol).join('\n');
}

module.exports = { renderStatusLine, renderGitExpanded, formatCost, shortModelName };

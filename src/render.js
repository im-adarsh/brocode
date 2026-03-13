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
 *
 * @param {string} url
 * @param {string} text  May contain ANSI codes
 * @returns {string}
 */
function osc8(url, text) {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

/**
 * Returns terminal width. Prefers $COLUMNS because stdout is piped when
 * Claude Code calls brocode-status, making process.stdout.columns undefined.
 * @returns {number}
 */
function termWidth() {
  return parseInt(process.env.COLUMNS, 10) ||
         process.stdout.columns            ||
         process.stderr.columns            || 80;
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

// ─── Segment builder (shared by all render functions) ─────────────────────────

/**
 * Builds the array of display segments from shared metrics.
 * All render functions call this then format the result differently.
 *
 * @param {object} opts
 * @param {string|null}   opts.branch
 * @param {object|null}   opts.gitChanges      { added, modified, deleted }
 * @param {string|null}   opts.gitToggleCmd
 * @param {string|null}   opts.model
 * @param {string|null}   opts.activeTool
 * @param {number|null}   opts.usedPct
 * @param {number|null}   opts.sessionCost
 * @param {number|null}   opts.monthlyCost
 * @param {string[]|null} opts.sessionFiles     Files touched this session
 * @param {string|null}   opts.sessionToggleCmd
 * @param {boolean}       opts.collapseGit      Show ▲ collapse link instead of changes
 * @param {boolean}       opts.collapseSession  Show ▲ collapse link instead of file count
 * @returns {string[]}
 */
function buildSegments({
  branch, gitChanges, gitToggleCmd,
  model, activeTool, usedPct,
  sessionCost, monthlyCost,
  sessionFiles, sessionToggleCmd,
  collapseGit = false, collapseSession = false,
}) {
  const parts = [];

  // ── Branch ───────────────────────────────────────────────────────────────
  if (branch) {
    let seg = `${C.green}⎇ ${branch}${C.reset}`;

    if (collapseGit) {
      const label = `${C.yellow}▲${C.reset}`;
      seg += `  ${gitToggleCmd ? osc8(`file://${gitToggleCmd}`, label) : label}`;
    } else if (gitChanges) {
      const { added, modified, deleted } = gitChanges;
      const bits = [];
      if (added)    bits.push(`${C.green}+${added}${C.reset}`);
      if (modified) bits.push(`${C.yellow}~${modified}${C.reset}`);
      if (deleted)  bits.push(`${C.red}-${deleted}${C.reset}`);
      if (bits.length) {
        const label = bits.join(' ');
        seg += `  ${gitToggleCmd ? osc8(`file://${gitToggleCmd}`, label) : label}`;
      }
    }

    parts.push(seg);
  }

  // ── Model ────────────────────────────────────────────────────────────────
  if (model) {
    parts.push(`${C.magenta}◆ ${shortModelName(model)}${C.reset}`);
  }

  // ── Active tool ──────────────────────────────────────────────────────────
  if (activeTool) {
    parts.push(`${C.cyan}⚡ ${activeTool}${C.reset}`);
  }

  // ── Files touched this session ────────────────────────────────────────────
  if (sessionFiles != null) {
    const count = sessionFiles.length;
    if (count > 0) {
      const label = `${C.white}✎ ${count}${C.reset}`;
      if (collapseSession) {
        const collapse = `${C.yellow}▲${C.reset}`;
        const link = sessionToggleCmd ? osc8(`file://${sessionToggleCmd}`, collapse) : collapse;
        parts.push(`${label}  ${link}`);
      } else {
        const link = sessionToggleCmd ? osc8(`file://${sessionToggleCmd}`, label) : label;
        parts.push(link);
      }
    }
  }

  // ── Context % ────────────────────────────────────────────────────────────
  if (usedPct != null) {
    const pct   = Math.round(usedPct);
    const color = usedPct >= 80 ? C.red : usedPct >= 60 ? C.yellow : C.green;
    const warn  = usedPct >= 80 ? `${C.red}⚠ ${C.reset}` : '';
    parts.push(`${warn}${color}${pct}%${C.reset}${C.dim} ctx${C.reset}`);
  }

  // ── Session cost ─────────────────────────────────────────────────────────
  if (sessionCost != null && sessionCost > 0) {
    parts.push(`${C.yellow}${formatCost(sessionCost)}${C.reset}${C.dim} session${C.reset}`);
  }

  // ── Monthly cost ─────────────────────────────────────────────────────────
  if (monthlyCost != null) {
    parts.push(`${C.yellow}${formatCost(monthlyCost)}${C.reset}${C.dim} /mo${C.reset}`);
  }

  return parts;
}

// ─── Status line (collapsed) ──────────────────────────────────────────────────

/**
 * Renders the status bar as a compact single line (no box).
 *
 * Claude Code's statusLine area is split: our output gets the left portion
 * and Claude Code's own model/effort/progress indicators get the right
 * portion. A full-width box overflows that boundary and gets truncated with
 * "…". A plain line degrades gracefully — Claude Code just clips it cleanly.
 *
 * Output:
 *   row 0 — segments joined by  ·  separators
 *   (optional) ─────── divider
 *   (optional) file rows
 *   (optional) ─────── divider
 *
 * @param {object} opts  — same shape as buildSegments opts
 * @returns {string}
 */
function renderStatusLine(opts) {
  const SEP     = `  ${C.dim}·${C.reset}  `;
  const W       = termWidth();
  const divider = `${C.cyan}${'─'.repeat(W)}${C.reset}`;

  // Drop segments from the end (lowest priority last) until content fits.
  // W - 4: 2-char buffer for double-wide Unicode symbols (⚡, ⚠) + 2-char
  // buffer for Claude Code's own left-margin padding.
  let parts = buildSegments(opts);
  let content = parts.join(SEP);
  while (visLen(content) > W - 4 && parts.length > 1) {
    parts = parts.slice(0, -1);
    content = parts.join(SEP);
  }

  const lines = [content + C.clearEol];

  // Always show uncommitted git files below a separator when present.
  const { gitFiles } = opts;
  if (gitFiles && gitFiles.length > 0) {
    const symbolColor = { M: C.yellow, A: C.green, D: C.red, '?': C.cyan };
    lines.push(divider + C.clearEol);
    for (const { symbol, file } of gitFiles) {
      const color = symbolColor[symbol] ?? C.white;
      lines.push(`  ${color}${symbol}${C.reset}  ${C.white}${file}${C.reset}${C.clearEol}`);
    }
    lines.push(divider + C.clearEol);
  }

  return lines.join('\n');
}

// ─── Expanded views ───────────────────────────────────────────────────────────

/**
 * Shared renderer for expanded inline file lists (git or session).
 * Renders: status bar line (with collapse ▲) + divider + file rows + divider.
 *
 * @param {object}                    opts        Same as renderStatusLine opts
 * @param {Array<{icon,color,file}>}  files       File rows to display
 * @param {boolean}                   collapseGit
 * @param {boolean}                   collapseSession
 * @returns {string}
 */
function renderExpanded(opts, files, { collapseGit = false, collapseSession = false } = {}) {
  const SEP     = `  ${C.dim}·${C.reset}  `;
  const W       = termWidth();
  const divider = `${C.cyan}${'─'.repeat(W)}${C.reset}`;

  const parts = buildSegments({ ...opts, collapseGit, collapseSession });
  const lines = [ parts.join(SEP) + C.clearEol, divider + C.clearEol ];

  for (const { icon, color, file } of files) {
    lines.push(`  ${color}${icon}${C.reset}  ${C.white}${file}${C.reset}${C.clearEol}`);
  }

  lines.push(divider + C.clearEol);
  return lines.join('\n');
}

/**
 * Renders the expanded git file list.
 *
 * @param {object}                    opts
 * @param {Array<{symbol,file}>|null} opts.gitFiles
 * @returns {string}
 */
function renderGitExpanded(opts) {
  const symbolColor = { M: C.yellow, A: C.green, D: C.red, '?': C.cyan };
  const files = (opts.gitFiles ?? []).map(({ symbol, file }) => ({
    icon:  symbol,
    color: symbolColor[symbol] ?? C.white,
    file,
  }));
  return renderExpanded(opts, files, { collapseGit: true });
}

/**
 * Renders the expanded session files list (files touched this session).
 *
 * @param {object} opts
 * @returns {string}
 */
function renderSessionExpanded(opts) {
  const files = (opts.sessionFiles ?? []).map(file => ({
    icon:  '✎',
    color: C.white,
    file,
  }));
  return renderExpanded(opts, files, { collapseSession: true });
}

module.exports = {
  renderStatusLine,
  renderGitExpanded,
  renderSessionExpanded,
  formatCost,
  shortModelName,
};

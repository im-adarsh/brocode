'use strict';

// ─── ANSI helpers ────────────────────────────────────────────────────────────

const C = {
  reset:        '\x1b[0m',
  bold:         '\x1b[1m',
  dim:          '\x1b[2m',
  // foregrounds
  red:          '\x1b[31m',
  green:        '\x1b[32m',
  yellow:       '\x1b[33m',
  blue:         '\x1b[34m',
  magenta:      '\x1b[35m',
  cyan:         '\x1b[36m',
  white:        '\x1b[37m',
  brightWhite:  '\x1b[97m',
};

/** Strips all ANSI escape sequences from a string. */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Pads a string (which may contain ANSI codes) to the given *visible* width.
 * @param {string} str
 * @param {number} width  Desired visible character width
 * @returns {string}
 */
function pad(str, width) {
  const visible = stripAnsi(str).length;
  return str + ' '.repeat(Math.max(0, width - visible));
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

/**
 * Renders a Unicode block progress bar with color-coded fill.
 *   0–59 % → green   60–79 % → yellow   80–100 % → red
 *
 * @param {number} pct    Percentage 0–100
 * @param {number} width  Character width of the bar
 * @returns {string}      ANSI-colored bar string
 */
function progressBar(pct, width = 18) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled  = Math.round((clamped / 100) * width);
  const empty   = width - filled;
  const color   = clamped >= 80 ? C.red : clamped >= 60 ? C.yellow : C.green;
  return `${color}${'█'.repeat(filled)}${C.dim}${'░'.repeat(empty)}${C.reset}`;
}

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
 * "claude-opus-4-6"    →  "Opus 4.6"
 * "claude-haiku-4-5"   →  "Haiku 4.5"
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

// ─── Welcome box ─────────────────────────────────────────────────────────────

/**
 * Renders the startup welcome box printed when `brocode` is invoked.
 * Mirrors the visual style of Claude Code's own startup box.
 *
 * @param {object}        opts
 * @param {string|null}   opts.branch      Git branch name, or null
 * @param {string|null}   opts.model       Last-used model ID, or null
 * @param {number|null}   opts.todayCost   USD spent today in this project, or null
 * @returns {string}  Multi-line ANSI string ready for process.stdout.write
 */
function renderWelcomeBox({ branch, model, todayCost }) {
  const INNER = 52; // visible characters between the border │ chars

  /** Wraps content in a bordered row, right-padding to INNER width. */
  const row = (content = '') =>
    `${C.brightWhite}│${C.reset} ${pad(content, INNER)} ${C.brightWhite}│${C.reset}`;

  const divider = `${C.brightWhite}├${'─'.repeat(INNER + 2)}┤${C.reset}`;
  const top     = `${C.brightWhite}╭${'─'.repeat(INNER + 2)}╮${C.reset}`;
  const bottom  = `${C.brightWhite}╰${'─'.repeat(INNER + 2)}╯${C.reset}`;

  // ── Title ──────────────────────────────────────────────────────────────────
  const titleRow = row(
    `${C.bold}${C.cyan}✦  brocode${C.reset}` +
    `  ${C.dim}· claude code, extended${C.reset}`
  );

  // ── Branch ─────────────────────────────────────────────────────────────────
  const branchVal = branch
    ? `${C.green}${branch}${C.reset}`
    : `${C.dim}not a git repo${C.reset}`;
  const branchRow = row(
    `  ${C.dim}⎇${C.reset}  ${pad(`${C.brightWhite}Branch${C.reset}`, 16 + 10)}${branchVal}`
  );

  // ── Model ──────────────────────────────────────────────────────────────────
  const modelVal = model
    ? `${C.magenta}${shortModelName(model)}${C.reset}`
    : `${C.dim}—${C.reset}`;
  const modelRow = row(
    `  ${C.dim}◆${C.reset}  ${pad(`${C.brightWhite}Model${C.reset}`, 16 + 10)}${modelVal}`
  );

  // ── Today's cost ───────────────────────────────────────────────────────────
  const costVal = todayCost != null
    ? `${C.yellow}${formatCost(todayCost)}${C.reset}${C.dim} today${C.reset}`
    : `${C.dim}no sessions yet today${C.reset}`;
  const costRow = row(
    `  ${C.dim}◈${C.reset}  ${pad(`${C.brightWhite}Usage${C.reset}`, 16 + 10)}${costVal}`
  );

  // ── Context hint ───────────────────────────────────────────────────────────
  const ctxRow = row(
    `  ${C.dim}⊞${C.reset}  ${pad(`${C.brightWhite}Context${C.reset}`, 16 + 10)}` +
    `${C.dim}live in status bar ↓${C.reset}`
  );

  return [
    top,
    row(),
    titleRow,
    row(),
    divider,
    row(),
    branchRow,
    modelRow,
    costRow,
    ctxRow,
    row(),
    bottom,
  ].join('\n');
}

// ─── Status line ──────────────────────────────────────────────────────────────

/**
 * Renders the single-line status bar shown at the bottom of Claude Code.
 * Called by `brocode-status` on every Claude Code refresh cycle.
 *
 * @param {object}        opts
 * @param {string|null}   opts.branch       Git branch name
 * @param {string|null}   opts.model        Active model ID (from Claude Code stdin)
 * @param {number|null}   opts.usedPct      Context window usage 0–100
 * @param {number|null}   opts.sessionCost  Estimated session cost in USD
 * @returns {string}
 */
function renderStatusLine({ branch, model, usedPct, sessionCost }) {
  const SEP = `  ${C.dim}·${C.reset}  `;
  const parts = [];

  if (branch) {
    parts.push(`${C.green}⎇ ${branch}${C.reset}`);
  }

  if (model) {
    parts.push(`${C.magenta}◆ ${shortModelName(model)}${C.reset}`);
  }

  if (usedPct != null) {
    const bar = progressBar(usedPct, 12);
    parts.push(`${bar} ${C.yellow}${Math.round(usedPct)}%${C.reset}`);
  }

  if (sessionCost != null) {
    parts.push(
      `${C.yellow}${formatCost(sessionCost)}${C.reset} ${C.dim}session${C.reset}`
    );
  }

  return parts.join(SEP);
}

module.exports = { renderWelcomeBox, renderStatusLine, progressBar, formatCost, shortModelName };

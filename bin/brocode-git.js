#!/usr/bin/env node
'use strict';

/**
 * brocode-git — interactive collapsible git status viewer.
 *
 * Run standalone:  brocode-git
 * Keyboard:        ↑↓ navigate sections   space/enter toggle   r refresh   q/ESC quit
 * Mouse:           click a section header to expand / collapse
 *
 * Uses the alternate screen buffer so the terminal is fully restored on exit.
 * Requires a TTY — exits with an error message if stdout is not a terminal.
 */

const { spawnSync } = require('child_process');

// ─── ANSI ─────────────────────────────────────────────────────────────────────

const C = {
  reset:      '\x1b[0m',
  bold:       '\x1b[1m',
  dim:        '\x1b[2m',
  red:        '\x1b[31m',
  green:      '\x1b[32m',
  yellow:     '\x1b[33m',
  cyan:       '\x1b[36m',
  magenta:    '\x1b[35m',
  white:      '\x1b[37m',
  brightWhite:'\x1b[97m',
};

const T = {
  clear:      '\x1b[2J',
  home:       '\x1b[H',
  clearEOL:   '\x1b[K',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  altOn:      '\x1b[?1049h',
  altOff:     '\x1b[?1049l',
  mouseOn:    '\x1b[?1000h\x1b[?1006h', // SGR extended mouse tracking
  mouseOff:   '\x1b[?1000l\x1b[?1006l',
};

// ─── Git ──────────────────────────────────────────────────────────────────────

function getGitBranch(cwd) {
  const r = spawnSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8', timeout: 2000 });
  return r.status === 0 ? r.stdout.trim() || null : null;
}

function parseGitStatus(cwd) {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8', timeout: 2000 });
  if (r.status !== 0) return null;

  const sections = [
    { label: 'Modified',  symbol: 'M', color: C.yellow,  files: [], expanded: false },
    { label: 'Added',     symbol: 'A', color: C.green,   files: [], expanded: false },
    { label: 'Deleted',   symbol: 'D', color: C.red,     files: [], expanded: false },
    { label: 'Untracked', symbol: '?', color: C.cyan,    files: [], expanded: false },
  ];

  for (const line of r.stdout.split('\n').filter(Boolean)) {
    const x = line[0], y = line[1], file = line.slice(3);
    if (x === '?')                              { sections[3].files.push(file); continue; }
    if (x === 'A')                              { sections[1].files.push(file); continue; }
    if (x === 'D' || y === 'D')                 { sections[2].files.push(file); continue; }
    if (x === 'M' || y === 'M' || x === 'R' || x === 'C') { sections[0].files.push(file); continue; }
  }

  return sections;
}

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  cwd:        process.cwd(),
  branch:     null,
  sections:   [],
  cursor:     0,
  headerRows: {}, // section index → 1-based terminal row (built during render)
};

function load() {
  state.branch   = getGitBranch(state.cwd);
  state.sections = parseGitStatus(state.cwd) ?? [];

  // Auto-expand the first non-empty section
  let first = true;
  for (const s of state.sections) {
    if (s.files.length && first) { s.expanded = true; first = false; }
    else s.expanded = false;
  }

  // Focus cursor on first non-empty section
  const idx = state.sections.findIndex(s => s.files.length > 0);
  state.cursor = idx >= 0 ? idx : 0;
}

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  const W      = process.stdout.columns || 80;
  const divider = `${C.dim}${'─'.repeat(W)}${C.reset}`;
  const total   = state.sections.reduce((n, s) => n + s.files.length, 0);
  const out     = [T.clear, T.home];
  state.headerRows = {};
  let row = 1;

  const push = line => { out.push(line + T.clearEOL + '\r\n'); row++; };

  // ── Header ────────────────────────────────────────────────────────────────
  const branchStr = state.branch
    ? `  ${C.green}⎇ ${state.branch}${C.reset}`
    : '';
  const totalStr = total === 0
    ? `${C.dim}clean${C.reset}`
    : `${C.dim}${total} change${total !== 1 ? 's' : ''}${C.reset}`;

  push(`${C.bold}${C.brightWhite} brocode${C.reset}  ${C.dim}git status${C.reset}${branchStr}  ${totalStr}`);
  push(divider);
  push('');

  if (total === 0) {
    push(`  ${C.dim}nothing to commit, working tree clean${C.reset}`);
    push('');
    push(divider);
    push(`${C.dim}  q quit${C.reset}`);
    process.stdout.write(out.join(''));
    return;
  }

  // ── Sections ──────────────────────────────────────────────────────────────
  for (let i = 0; i < state.sections.length; i++) {
    const sec      = state.sections[i];
    const isCursor = state.cursor === i;
    const hasFiles = sec.files.length > 0;

    if (!hasFiles) {
      // Empty section — dimmed, no chevron, not interactive
      push(`  ${C.dim}·  ${sec.label}  (0)${C.reset}`);
    } else {
      const chevron   = sec.expanded ? '▼' : '▶';
      const labelCol  = isCursor ? C.brightWhite : sec.color;
      const countStr  = `${C.dim}(${sec.files.length})${C.reset}`;

      state.headerRows[i] = row; // record row for mouse hit-test
      push(`  ${labelCol}${chevron}${C.reset}  ${labelCol}${C.bold}${sec.label}${C.reset}  ${countStr}`);

      if (sec.expanded) {
        for (const file of sec.files) {
          push(`       ${sec.color}${sec.symbol}${C.reset}  ${C.white}${file}${C.reset}`);
        }
      }
    }

    push('');
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  push(divider);
  push(
    `${C.dim}  ↑↓ navigate   space/enter toggle   r refresh   q quit${C.reset}`
  );

  process.stdout.write(out.join(''));
}

// ─── Input ────────────────────────────────────────────────────────────────────

function moveCursor(delta) {
  const active = state.sections.map((s, i) => ({ s, i })).filter(x => x.s.files.length > 0);
  if (!active.length) return;
  const cur  = active.findIndex(x => x.i === state.cursor);
  const next = active[(cur + delta + active.length) % active.length];
  state.cursor = next.i;
  render();
}

function toggleCursor() {
  const sec = state.sections[state.cursor];
  if (sec?.files.length) { sec.expanded = !sec.expanded; render(); }
}

function handleClick(_x, y) {
  for (const [idxStr, headerRow] of Object.entries(state.headerRows)) {
    if (y === headerRow) {
      const i   = parseInt(idxStr, 10);
      const sec = state.sections[i];
      if (sec?.files.length) {
        state.cursor  = i;
        sec.expanded  = !sec.expanded;
        render();
      }
      return;
    }
  }
}

function handleInput(buf) {
  const s = buf.toString('utf8');

  if (s === 'q' || s === '\x1b' || s === '\x03') return cleanup();
  if (s === '\x1b[A') return moveCursor(-1); // arrow up
  if (s === '\x1b[B') return moveCursor(1);  // arrow down
  if (s === ' ' || s === '\r') return toggleCursor();
  if (s === 'r') { load(); render(); return; }

  // SGR mouse: ESC [ < btn ; col ; row M (press) or m (release)
  const m = s.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
  if (m && m[4] === 'M' && parseInt(m[1], 10) === 0) {
    handleClick(null, parseInt(m[3], 10));
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

function cleanup() {
  process.stdout.write(T.mouseOff + T.showCursor + T.altOff);
  if (process.stdin.setRawMode) process.stdin.setRawMode(false);
  process.exit(0);
}

function main() {
  if (!process.stdout.isTTY) {
    process.stderr.write('brocode-git requires a TTY\n');
    process.exit(1);
  }

  load();

  process.stdout.write(T.altOn + T.hideCursor + T.mouseOn);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', handleInput);
  process.stdout.on('resize', render);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  render();
}

main();

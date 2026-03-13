# brocode — Claude Code Guidelines

## Project purpose

`brocode` is a zero-dependency Node.js CLI that wraps Claude Code (`claude`) and adds a
**live status bar** — a full-width cyan box — at the bottom of the Claude Code UI:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  ⎇ main  +2 ~3 -1  ·  ◆ Sonnet 4.6  ·  ⚡ Bash  ·  18% ctx  ·  $3.42 month │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Segment | Source | Notes |
|---|---|---|
| `⎇ branch +A ~M -D` | `git branch`, `git status --porcelain` | Changes are a clickable OSC 8 toggle link |
| `◆ Model` | Claude Code stdin `model.id` | |
| `⚡ Tool` | Last `tool_use` in session JSONL | MCP tools shown as `MCP:server` |
| `18% ctx` | Claude Code stdin `context_window.used_percentage` | Color: green/yellow/red |
| `$N.NN month` | Anthropic Cost Report API | Cached 5 min, needs Admin API key |

Clicking `+A ~M -D` toggles an inline file list directly in the status bar area —
the bar expands to show all changed files grouped by status, and clicking `▲`
collapses it again.

No runtime npm dependencies — only the Node.js standard library.

## Architecture

```
brocode/
├── bin/
│   ├── brocode.js          Entry point: configures status bar → launches claude
│   ├── brocode-status.js   Status line provider: reads stdin JSON → outputs one or more lines
│   └── brocode-git.js      Interactive collapsible git status TUI
├── src/
│   ├── metrics.js          Data layer: git, session JSONL, monthly cost API
│   └── render.js           Presentation layer: status line rendering
└── package.json
```

**Data flow — startup**
```
brocode.js
  → ensureStatusLine()      writes statusLine to ~/.claude/settings.json if absent
  → spawn('claude', args)   hands off to Claude Code
```

**Data flow — status bar (live, on every Claude Code refresh)**
```
Claude Code → brocode-status stdin (JSON)
  → getGitBranch(cwd)               git branch --show-current
  → data.model.id                   model name from stdin
  → getActiveTool(transcript_path)  tail session JSONL → last tool_use name
  → ctx.used_percentage             context % from stdin
  → fetchMonthlyCost()              GET /v1/organizations/cost_report (cached 5 min)
  → ensureGitToggleCommand()        writes /tmp/brocode-git-toggle.command if absent
  → isGitExpanded()                 checks /tmp/brocode-git-expanded state file
  if expanded:
    → getGitFiles(cwd)              git status --porcelain → full file list
    → renderGitExpanded()           multi-line ANSI output → stdout
  else:
    → getGitChanges(cwd)            git status --porcelain → +A ~M -D counts
    → renderStatusLine()            one ANSI line → stdout → Claude Code status bar
```

## Key conventions

### No external dependencies
All rendering uses raw ANSI escape codes. All I/O uses `child_process.spawnSync`,
`fs`, and `https`. Do not add npm packages.

### spawnSync not execSync
`spawnSync` is used for all git calls. Args are passed as an array — never
interpolated into a shell string — which prevents command injection.

### ANSI color constants live in `src/render.js`
The `C` object holds all ANSI codes including `C.clearEol` (`\x1b[0K`). Do not
inline escape literals elsewhere. `clearEol` is appended to every output line so
that shorter refreshes don't leave stale characters from a previous longer line.

### Status bar box rendering
`renderStatusLine` outputs **7 lines** forming a full-width cyan box with ~8px
padding on all sides (1 blank line outside top/bottom, 1 blank row inside
top/bottom, 1 space inside left/right):

```
[blank]                  ← outside top padding; Claude Code nudge text lands here
┌──────────────────────┐  ← box border in C.cyan
│                      │  ← inside top padding
│  content segments    │  ← 1 space left/right padding
│                      │  ← inside bottom padding
└──────────────────────┘  ← box border in C.cyan
[blank]                  ← outside bottom padding
```

Box borders use `C.cyan` to match Claude Code's structural UI colour. Content is
right-padded to fill the inner width exactly using `visLen()` (which strips ANSI
codes before measuring).  The helper `stripAnsi()` handles both CSI SGR sequences
and OSC 8 hyperlink sequences so the padding calculation is accurate even when the
branch segment contains a clickable link.

### Git changes are clickable via OSC 8
`ensureGitToggleCommand()` writes a bash script to `/tmp/brocode-git-toggle.command`
that flips the state file `/tmp/brocode-git-expanded` and silently closes its own
Terminal.app/iTerm2 window via `osascript`. `renderStatusLine` wraps the `+A ~M -D`
text in an OSC 8 hyperlink pointing to that `.command` file. On macOS, clicking a
`file://` OSC 8 link to a `.command` file runs it in a new shell window, which
closes itself immediately — effectively a click-to-toggle. When expanded,
`renderGitExpanded` renders the full file list inline below the status bar, and
wraps `▲` in an OSC 8 link to the same toggle script so clicking it collapses again.

### Active tool is read from the session JSONL
`getActiveTool(transcriptPath)` scans from the end of the JSONL for the most
recent `assistant` message with a `tool_use` block. `transcript_path` is provided
in the Claude Code stdin JSON. MCP tools (`mcp__server__tool`) are shortened to
`MCP:server` for display.

### Context window shown as % only
The context usage is displayed as a plain colored percentage (`18% ctx`) — no
progress bar. Color thresholds: green < 60%, yellow 60–80%, red ≥ 80%.

### Session cost is not shown
Session cost (`data.cost.total_cost_usd`) from Claude Code stdin is not displayed
anywhere in the status bar. Only the monthly cost (from Anthropic's API) is shown.

### Monthly cost requires an Admin API key
`fetchMonthlyCost()` calls `GET /v1/organizations/cost_report` which requires an
Admin API key (not a regular API key). Set `ANTHROPIC_ADMIN_API_KEY` in the
environment. If absent, the month segment is silently omitted.

### Monthly cost caching
The API response is written to `/tmp/brocode-monthly-cost.json` with a 5-minute
TTL. The cache stores `{ cost: number, fetchedAt: number }`.

### Status line stdin schema
```
{
  cwd:             string,
  transcript_path: string,
  model:           { id: string, display_name: string },
  cost:            { total_cost_usd: number },
  context_window:  { used_percentage: number }
}
```

### Status line contract
`brocode-status` must:
1. Read all of stdin before parsing (never parse partial JSON)
2. Print one line (collapsed) or multiple lines (expanded) to stdout — each line
   ends with `C.clearEol` so stale characters from a shorter previous render are erased
3. Exit 0 — any non-zero exit causes Claude Code to blank the status bar

## brocode-git TUI

Running `brocode-git` opens a full-screen interactive viewer:

```
 brocode  git status  ⎇ main   3 changes
 ────────────────────────────────────────
  ▼  Modified  (2)
       M  src/metrics.js
       M  src/render.js

  ▶  Added  (1)

  ·  Deleted  (0)
  ·  Untracked  (0)

 ────────────────────────────────────────
   ↑↓ navigate   space/enter toggle   r refresh   q quit
```

- **Mouse**: click a section header (`▶`/`▼`) to expand/collapse
- **Keyboard**: `↑↓` move between sections, `space`/`enter` toggle, `r` refresh, `q`/`ESC` quit
- Uses the **alternate screen buffer** — terminal state is fully restored on exit
- SGR extended mouse tracking (`\x1b[?1006h`) — works in iTerm2, Warp, Kitty, etc.

## Common tasks

**Add a new metric to the status bar**

The fastest way is to use the `/add-metric` slash command (`.claude/commands/add-metric.md`).
It will ask what to show and where the data comes from, then make all three changes
atomically.

Manually:
1. Add a data-fetching function to `src/metrics.js` and export it
2. Call it in `bin/brocode-status.js` and pass the result to both render functions
3. Add a new `parts.push(...)` block in **both** `renderStatusLine` and
   `renderGitExpanded` in `src/render.js` (keep them in sync)

**Change the monthly cost cache TTL**
Edit `COST_CACHE_TTL` at the top of `src/metrics.js`.

**Change the status line command**
Edit `settings.statusLine.command` in `ensureStatusLine()` inside `bin/brocode.js`.
`ensureStatusLine` only writes the setting when absent — delete the `statusLine` key
from `~/.claude/settings.json` to force an update.

**Change git expansion toggle behavior**
Edit `ensureGitToggleCommand()` in `src/metrics.js` — the script written to
`/tmp/brocode-git-toggle.command` controls what happens when the user clicks the
git changes in the status bar.

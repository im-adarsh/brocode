# brocode — Claude Code Guidelines

## Project purpose

`brocode` is a zero-dependency Node.js CLI that wraps Claude Code (`claude`) and adds a
**live status bar** at the bottom of the Claude Code UI:

```
⎇ main  +2 ~3 -1  ·  ◆ Sonnet 4.6  ·  ⚡ Bash  ·  18% ctx  ·  $3.42 month
```

| Segment | Source | Notes |
|---|---|---|
| `⎇ branch +A ~M -D` | `git branch`, `git status --porcelain` | Changes are a clickable OSC 8 link |
| `◆ Model` | Claude Code stdin `model.id` | |
| `⚡ Tool` | Last `tool_use` in session JSONL | MCP tools shown as `MCP:server` |
| `18% ctx` | Claude Code stdin `context_window.used_percentage` | Color: green/yellow/red |
| `$N.NN month` | Anthropic Cost Report API | Cached 5 min, needs Admin API key |

Clicking `+A ~M -D` opens `/tmp/brocode-git-status.txt` — a full file list (like
`git status`) that also includes the session cost for this session.

No runtime npm dependencies — only the Node.js standard library.

## Architecture

```
brocode/
├── bin/
│   ├── brocode.js          Entry point: configures status bar → launches claude
│   ├── brocode-status.js   Status line provider: reads stdin JSON → outputs one line
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
  → getGitBranch(cwd)                  git branch --show-current
  → getGitChanges(cwd)                 git status --porcelain → +A ~M -D counts
  → writeGitStatusFile(cwd, cost)      writes /tmp/brocode-git-status.txt (on demand)
  → data.model.id                      model name from stdin
  → getActiveTool(transcript_path)     tail session JSONL → last tool_use name
  → ctx.used_percentage                context % from stdin
  → fetchMonthlyCost()                 GET /v1/organizations/cost_report (cached 5 min)
  → renderStatusLine()                 one ANSI line → stdout → Claude Code status bar
```

## Key conventions

### No external dependencies
All rendering uses raw ANSI escape codes. All I/O uses `child_process.spawnSync`,
`fs`, and `https`. Do not add npm packages.

### spawnSync not execSync
`spawnSync` is used for all git calls. Args are passed as an array — never
interpolated into a shell string — which prevents command injection.

### ANSI color constants live in `src/render.js`
The `C` object holds all ANSI codes. Do not inline escape literals elsewhere.

### Git changes are clickable via OSC 8
`writeGitStatusFile(cwd, sessionCost)` writes a plain-text summary to
`/tmp/brocode-git-status.txt` on every refresh (only when there are changes).
`renderStatusLine` wraps the `+A ~M -D` text in an OSC 8 hyperlink pointing to
that file. Clicking opens it in the default text viewer (iTerm2, Warp, etc.).
The file also includes the session cost so it's accessible on demand without
appearing in the status bar permanently.

### Active tool is read from the session JSONL
`getActiveTool(transcriptPath)` scans from the end of the JSONL for the most
recent `assistant` message with a `tool_use` block. `transcript_path` is provided
in the Claude Code stdin JSON. MCP tools (`mcp__server__tool`) are shortened to
`MCP:server` for display.

### Context window shown as % only
The context usage is displayed as a plain colored percentage (`18% ctx`) — no
progress bar. Color thresholds: green < 60%, yellow 60–80%, red ≥ 80%.

### Session cost is not in the status bar
Session cost (`data.cost.total_cost_usd`) is embedded in the on-demand git status
file but not shown permanently in the status bar. Only the monthly cost (from
Anthropic's API) is shown.

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
2. Print exactly one line to stdout
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
1. Add a data-fetching function to `src/metrics.js` and export it
2. Call it in `bin/brocode-status.js` and pass the result to `renderStatusLine`
3. Add a new `parts.push(...)` block in `renderStatusLine` in `src/render.js`

**Add info to the on-demand git status file**
Edit `writeGitStatusFile()` in `src/metrics.js`.

**Change the monthly cost cache TTL**
Edit `COST_CACHE_TTL` at the top of `src/metrics.js`.

**Change the status line command**
Edit `settings.statusLine.command` in `ensureStatusLine()` inside `bin/brocode.js`.
`ensureStatusLine` only writes the setting when absent — delete the `statusLine` key
from `~/.claude/settings.json` to force an update.

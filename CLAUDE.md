# brocode — Claude Code Guidelines

## Project purpose

`brocode` is a zero-dependency Node.js CLI that wraps Claude Code (`claude`) and adds a
**live status bar** — a compact single line — at the bottom of the Claude Code UI:

```
⎇ main +2 ~3  ·  ◆ Sonnet 4.6  ·  ⚡ Bash  ·  ✎ 4  ·  18% ctx  ·  $0.42 session
```

| Segment | Source | Notes |
|---|---|---|
| `⎇ branch +A ~M -D` | `git branch`, `git status --porcelain` | Clickable — expands git file list |
| `◆ Model` | Claude Code stdin `model.id` | |
| `⚡ Tool` | Last `tool_use` in session JSONL | MCP tools shown as `MCP:server` |
| `✎ N` | Session state file `/tmp/brocode-session.json` | Clickable — expands files-touched list |
| `18% ctx` | Claude Code stdin `context_window.used_percentage` | Green < 60%, yellow 60–80%, red + ⚠ ≥ 80% |
| `$0.42 session` | Claude Code stdin `cost.total_cost_usd` | Hidden if value is out of $0–$100 range |
| `$N.NN /mo` | Anthropic Cost Report API | Cached 5 min, needs `ANTHROPIC_ADMIN_API_KEY` |

No runtime npm dependencies — only the Node.js standard library.

## Architecture

```
brocode/
├── bin/
│   ├── brocode.js            Entry point: configures settings → launches claude
│   ├── brocode-status.js     Status line provider: reads stdin JSON → outputs status bar
│   ├── brocode-hook-tool.js  PostToolUse hook: tracks tool calls + edited files
│   ├── brocode-hook-stop.js  Stop hook: archives session on exit
│   └── brocode-git.js        Interactive collapsible git status TUI
├── src/
│   ├── metrics.js            Data layer: git, session state, JSONL, cost API
│   └── render.js             Presentation layer: ANSI rendering
└── package.json
```

**Data flow — startup**
```
brocode.js
  → ensureStatusLine()     writes statusLine to ~/.claude/settings.json (once)
  → ensureHooks()          registers PostToolUse + Stop hooks (once)
  → initSessionState(cwd)  writes /tmp/brocode-session.json (every launch)
  → spawn('claude', args)  hands off to Claude Code
```

**Data flow — status bar (live, on every Claude Code refresh)**
```
Claude Code → brocode-status stdin (JSON)
  → getGitBranch(cwd)               git branch --show-current
  → getGitChanges(cwd)              git status --porcelain → +A ~M -D counts
  → getSessionData()                reads /tmp/brocode-session.json
  → data.model.id                   model name from stdin
  → getActiveTool(transcript_path)  tail session JSONL → last tool_use name
  → ctx.used_percentage             context % from stdin
  → sessionCost (validated)         data.cost.total_cost_usd, only if 0–$100
  → fetchMonthlyCost()              GET /v1/organizations/cost_report (cached 5 min)
  → ensureGitToggleCommand()        writes /tmp/brocode-git-toggle.command
  → ensureSessionToggleCommand()    writes /tmp/brocode-session-toggle.command

  if isGitExpanded():
    → getGitFiles(cwd)              full git status file list
    → renderGitExpanded()           status bar + file list (multi-line ANSI)
  elif isSessionExpanded():
    → renderSessionExpanded()       status bar + session files list (multi-line ANSI)
  else:
    → renderStatusLine()            5-line cyan box → stdout
```

**Data flow — hooks (background, fires on every tool call)**
```
Claude Code PostToolUse → brocode-hook-tool stdin (JSON)
  → reads /tmp/brocode-session.json
  → increments toolCalls counter
  → if tool is Edit/Write/MultiEdit/NotebookEdit: records file_path
  → writes /tmp/brocode-session.json

Claude Code Stop → brocode-hook-stop stdin (JSON)
  → reads /tmp/brocode-session.json
  → adds endTime
  → writes /tmp/brocode-last-session.json
  → deletes /tmp/brocode-session.json
```

## Key conventions

### No external dependencies
All rendering uses raw ANSI escape codes. All I/O uses `child_process.spawnSync`,
`fs`, `path`, `os`, and `https`. Do not add npm packages.

### spawnSync not execSync
`spawnSync` is used for all git calls. Args are passed as an array — never
interpolated into a shell string — which prevents command injection.

### ANSI color constants live in `src/render.js`
The `C` object holds all ANSI codes including `C.clearEol` (`\x1b[0K`). Do not
inline escape literals elsewhere. `clearEol` is appended to every output line.

### Status bar rendering (compact single line)
`renderStatusLine` outputs a plain line — no box. Claude Code's `statusLine` area
is split: our output gets the left portion and Claude Code's own model/effort/progress
indicators get the right portion. A full-width box would overflow that boundary and
get truncated with `…`. A plain line degrades cleanly.

```
⎇ main +2 ~3  ·  ◆ Sonnet 4.6  ·  ⚡ Bash  ·  ✎ 4  ·  18% ctx  ·  $0.42 session
```

When uncommitted files exist, a divider and file rows follow:

```
⎇ main +2 ~3  ·  ◆ Sonnet 4.6  ·  ⚡ Bash  ·  ✎ 4  ·  18% ctx  ·  $0.42 session
────────────────────────────────────────────────────────────────────────────────
  M  src/metrics.js
  A  bin/brocode-hook-tool.js
────────────────────────────────────────────────────────────────────────────────
```

### Content overflow protection
`renderStatusLine` measures `visLen(content)` and drops segments from the end until
`visLen(content) <= W - 4`. `visLen()` uses `stripAnsi()` to strip CSI SGR codes
and OSC 8 hyperlink sequences before counting characters.

### sessionCost sanity check
`data.cost.total_cost_usd` from Claude Code may arrive in unexpected units (e.g.,
micro-dollars). `brocode-status.js` only passes the value to the renderer when it
is in the range `[0, 100]` — otherwise `sessionCost` is set to null and the segment
is hidden.

### Clickable segments via OSC 8
Git changes (`+A ~M -D`) and session file count (`✎ N`) are wrapped in OSC 8
hyperlinks. Clicking opens a `.command` file in `/tmp` that toggles a state file
(`brocode-git-expanded` or `brocode-session-expanded`) and closes itself via
`osascript`. This collapses/expands the inline file list on the next refresh.

### Active tool from session JSONL
`getActiveTool(transcriptPath)` scans from the end of the JSONL for the most
recent `assistant` message with a `tool_use` block. `transcript_path` is in the
Claude Code stdin JSON. MCP tools (`mcp__server__tool`) are shortened to `MCP:server`.

### Context window coloring
Green < 60%, yellow 60–80%, red ≥ 80%. At ≥ 80% a `⚠` warning prefix is added.

### Monthly cost requires Admin API key
`fetchMonthlyCost()` calls `GET /v1/organizations/cost_report`. Set
`ANTHROPIC_ADMIN_API_KEY` in the environment. If absent, the `/mo` segment is
silently omitted. Results cached in `/tmp/brocode-monthly-cost.json` for 5 minutes.

### Session state file
`/tmp/brocode-session.json` — written by `brocode.js` on launch, updated by
`brocode-hook-tool.js` after each tool call, archived by `brocode-hook-stop.js`
on exit. Schema: `{ startTime, checkpointSha, checkpointCwd, files[], toolCalls }`.

### Hooks are idempotent
`ensureHooks()` in `brocode.js` checks for existing hook entries before adding new
ones. Safe to run on every launch. Hook scripts must always exit 0.

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
2. Print output to stdout — every line ends with `C.clearEol`
3. Exit 0 — any non-zero exit causes Claude Code to blank the status bar

## Slash commands

| Command | File | What it does |
|---|---|---|
| `/session` | `.claude/commands/session.md` | Prints session summary: duration, files, tool calls, cost, git SHA |
| `/add-metric` | `.claude/commands/add-metric.md` | Guides through adding a new status bar segment |

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
- **Keyboard**: `↑↓` navigate, `space`/`enter` toggle, `r` refresh, `q`/`ESC` quit
- Uses the **alternate screen buffer** — terminal state fully restored on exit
- SGR extended mouse tracking (`\x1b[?1006h`) — works in iTerm2, Warp, Kitty, etc.

## Common tasks

**Add a new metric to the status bar**

The fastest way is the `/add-metric` slash command — it guides through all three
files atomically. Manually:
1. Add a data-fetching function to `src/metrics.js` and export it
2. Call it in `bin/brocode-status.js` and add to the `shared` object
3. Add a `parts.push(...)` block inside `buildSegments()` in `src/render.js`

**Change the monthly cost cache TTL**
Edit `COST_CACHE_TTL` at the top of `src/metrics.js`.

**Change the status line command**
Edit `settings.statusLine.command` in `ensureStatusLine()` in `bin/brocode.js`.
Delete the `statusLine` key from `~/.claude/settings.json` to force an update.

**Re-register hooks after manual edit**
Delete the `hooks` section from `~/.claude/settings.json` — brocode will re-add
them on next launch.

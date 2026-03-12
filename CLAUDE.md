# brocode — Claude Code Guidelines

## Project purpose

`brocode` is a zero-dependency Node.js CLI that wraps Claude Code (`claude`) and adds:
- A **welcome box** on startup (git branch, model, today's cost)
- A **live status bar** inside Claude Code showing branch, model name, context progress, and session cost

It has no runtime dependencies — only the Node.js standard library.

## Architecture

```
brocode/
├── bin/
│   ├── brocode.js          Entry point: renders welcome box → launches claude
│   └── brocode-status.js   Status line provider: reads Claude Code stdin JSON → outputs one line
├── src/
│   ├── metrics.js          Data layer: git, session files, cost calculation
│   └── render.js           Presentation layer: ANSI box + status line rendering
└── package.json
```

**Data flow — welcome box (startup)**
```
brocode.js
  → metrics.getGitBranch()       spawnSync git
  → metrics.getLastUsedModel()   reads ~/.claude/projects/<key>/*.jsonl
  → metrics.getTodayCost()       reads ~/.claude/projects/<key>/*.jsonl
  → render.renderWelcomeBox()    outputs ANSI box to stdout
  → spawn('claude', args)        hands off to Claude Code
```

**Data flow — status bar (live, inside Claude Code)**
```
Claude Code → brocode-status stdin (JSON)
  → metrics.getGitBranch(data.cwd)
  → metrics.calcCost(data.context_window tokens)
  → render.renderStatusLine()    outputs one ANSI line to stdout → Claude Code status bar
```

## Key conventions

### No external dependencies
All rendering uses raw ANSI escape codes. All data comes from `child_process.spawnSync` and
Node's `fs` module. Do not add npm packages — keep the install footprint at zero.

### spawnSync not execSync
`spawnSync` is used for git calls (not `execSync`/`exec`). This prevents shell injection because
args are passed as an array, never interpolated into a shell string.

### ANSI color constants live in `src/render.js`
The `C` object in `render.js` holds all ANSI codes. Do not inline escape literals elsewhere.

### Pricing constants live in `src/metrics.js`
The `PRICE` object holds per-token rates. Update only there when Anthropic changes pricing.

### `pad()` uses visible width
`pad(str, width)` strips ANSI codes before measuring length so box columns stay aligned
regardless of color codes. Always use `pad()` when placing ANSI-colored text inside a
fixed-width box cell.

### Session JSONL format
Claude Code writes session data to `~/.claude/projects/<encoded-path>/<uuid>.jsonl`.
Each line is a JSON object; usage data lives at `obj.message.usage` and the model at
`obj.message.model`. Lines may be malformed — always wrap per-line parsing in `try/catch`.

### The path encoding scheme
`/Users/foo/bar` → `-Users-foo-bar` (replace `/` with `-`, strip leading `-`).
Implemented in `metrics.toProjectKey()`. Do not duplicate this logic.

### Status line contract
`brocode-status` must:
1. Read all of stdin before parsing (never parse partial JSON)
2. Print exactly one line to stdout
3. Exit 0 — any non-zero exit causes Claude Code to blank the status bar

## Common tasks

**Add a new metric to the status bar**
1. Extract the value from the stdin JSON in `bin/brocode-status.js`
2. Pass it to `renderStatusLine()` in `src/render.js`
3. Add a new `parts.push(...)` block in `renderStatusLine`

**Add a new row to the welcome box**
1. Fetch the data in `bin/brocode.js` and pass it via `opts` to `renderWelcomeBox`
2. Add a new `row(...)` call in `renderWelcomeBox` in `src/render.js`
3. Remember to use `pad()` for any ANSI-colored label

**Update pricing**
Edit the `PRICE` object at the top of `src/metrics.js`.

**Change the status line command**
Edit `settings.statusLine.command` in `ensureStatusLine()` inside `bin/brocode.js`.
Note: `ensureStatusLine` only writes the setting if it is absent — existing user
configuration is preserved. To force an update, delete the `statusLine` key from
`~/.claude/settings.json`.

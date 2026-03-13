# brocode ✦

> Claude Code, extended.

brocode wraps the `claude` CLI with a live status bar, automatic session tracking,
and hooks — giving you a real-time HUD at the bottom of Claude Code with no
configuration required.

**[Website](https://im-adarsh.github.io/brocode)** · [npm](https://www.npmjs.com/package/brocode) · [Issues](https://github.com/im-adarsh/brocode/issues)

---

## What it looks like

Full-width cyan box at the bottom of Claude Code, updates live:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⎇ main +2 ~3  ·  ◆ Sonnet 4.6  ·  ⚡ Bash  ·  ✎ 4  ·  18% ctx  ·  $0.42 session │
└──────────────────────────────────────────────────────────────────────────────┘
```

Context warning fires at ≥ 80%:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⎇ main  ·  ◆ Sonnet 4.6  ·  ✎ 12  ·  ⚠ 87% ctx  ·  $3.21 session  ·  $18.40 /mo │
└──────────────────────────────────────────────────────────────────────────────┘
```

Clicking `+2 ~3` expands the git file list inline:

```
⎇ main  ▲  ·  ◆ Sonnet 4.6  ·  ✎ 4  ·  18% ctx  ·  $0.42 session
────────────────────────────────────────────────────────────────────────────────
  M  src/metrics.js
  M  src/render.js
  A  bin/brocode-hook-tool.js
────────────────────────────────────────────────────────────────────────────────
```

Clicking `✎ 4` expands the session file list (files touched this session):

```
⎇ main  ·  ◆ Sonnet 4.6  ·  ✎ 4 ▲  ·  18% ctx  ·  $0.42 session
────────────────────────────────────────────────────────────────────────────────
  ✎  src/metrics.js
  ✎  src/render.js
  ✎  bin/brocode-status.js
  ✎  package.json
────────────────────────────────────────────────────────────────────────────────
```

---

## Install

```bash
npm install -g brocode
```

Requires Node.js ≥ 18 and `claude` (Claude Code) in your PATH.

## Usage

Use `brocode` anywhere you'd use `claude`. Every argument is forwarded unchanged.

```bash
brocode                  # same as: claude
brocode --resume         # same as: claude --resume
brocode "fix the bug"    # same as: claude "fix the bug"
```

On first run, brocode automatically:
- Writes a `statusLine` entry into `~/.claude/settings.json`
- Registers `PostToolUse` and `Stop` hooks to track session activity
- Initialises the session state (records git HEAD as a checkpoint reference)

---

## How it works

| Command | Role |
|---|---|
| `brocode` | Configures status line + hooks on first run, then launches `claude` |
| `brocode-status` | Called by Claude Code on each refresh — reads stdin JSON, outputs the status bar |
| `brocode-git` | Interactive full-screen git status TUI — collapsible sections, mouse support |
| `brocode-hook-tool` | PostToolUse hook — tracks every tool call and records edited file paths |
| `brocode-hook-stop` | Stop hook — archives session summary when Claude Code exits |

**Status bar segments:**

| Segment | Source | Notes |
|---|---|---|
| `⎇ branch +A ~M -D` | `git branch`, `git status --porcelain` | Clickable — expands git file list |
| `◆ Model` | `model.id` from Claude Code stdin | |
| `⚡ Tool` | Last `tool_use` in session JSONL | MCP tools shown as `MCP:server` |
| `✎ N` | Session state file (`/tmp/brocode-session.json`) | Clickable — expands files-touched list |
| `18% ctx` | `context_window.used_percentage` from stdin | Green < 60%, yellow 60–80%, red + ⚠ ≥ 80% |
| `$0.42 session` | `cost.total_cost_usd` from Claude Code stdin | Cost so far this session |
| `$N.NN /mo` | `GET /v1/organizations/cost_report` | Requires `ANTHROPIC_ADMIN_API_KEY`; cached 5 min |

**Hooks (auto-registered in `~/.claude/settings.json`):**

| Hook | Trigger | What it does |
|---|---|---|
| `PostToolUse` | Every tool call | Increments call counter; records `file_path` for Edit/Write/MultiEdit/NotebookEdit |
| `Stop` | Session exit | Archives session state to `/tmp/brocode-last-session.json` |

**Slash commands (`.claude/commands/`):**

| Command | What it does |
|---|---|
| `/session` | Prints a session summary — duration, files touched, tool calls, cost, git checkpoint SHA |
| `/add-metric` | Guided walkthrough for adding a new status bar segment |

---

## Zero dependencies

brocode uses only Node.js standard library modules (`child_process`, `fs`, `path`, `os`, `https`).
Nothing to `npm audit`. Nothing that breaks on a major version bump.

---

## GitHub Pages

The project website lives in `docs/`. To enable:

1. Push to GitHub
2. Go to **Settings → Pages → Source**
3. Set branch to `main`, folder to `/docs`

---

## Contributing

See [CLAUDE.md](./CLAUDE.md) for architecture notes, coding conventions, and how to add new metrics.

```bash
git clone https://github.com/im-adarsh/brocode.git
cd brocode
npm install -g .   # install locally for testing
brocode            # test it
```

### Adding a new metric

```
/add-metric
```

Run inside Claude Code from the brocode repo. Guides you through the full
`metrics.js` → `brocode-status.js` → `render.js` pipeline in one pass.

## License

[MIT](./LICENSE)

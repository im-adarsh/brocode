# brocode ✦

> Claude Code, extended.

brocode wraps the `claude` CLI with a persistent live status bar showing git branch, active model, context window usage, and monthly cost — always visible at the bottom of Claude Code.

**[Website](https://your-username.github.io/brocode)** · [npm](https://www.npmjs.com/package/brocode) · [Issues](https://github.com/your-username/brocode/issues)

---

## What it looks like

Status bar (bottom of Claude Code, updates live):

```
⎇ main  +2 ~3 -1  ·  ◆ Sonnet 4.6  ·  ⚡ Bash  ·  18% ctx  ·  $3.42 month
```

Clicking `+2 ~3 -1` expands the file list inline:

```
⎇ main  ▲  ·  ◆ Sonnet 4.6  ·  ⚡ Bash  ·  18% ctx  ·  $3.42 month
────────────────────────────────────────────────────────────────────────────────
  M  src/metrics.js
  M  src/render.js
  A  bin/brocode-git.js
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

On first run, brocode writes a `statusLine` entry into `~/.claude/settings.json` so the status bar appears automatically inside Claude Code.

---

## How it works

| Command | Role |
|---|---|
| `brocode` | Configures the status line once (on first run), then launches `claude` |
| `brocode-status` | Called by Claude Code on each refresh — reads context JSON from stdin, outputs one formatted line |
| `brocode-git` | Interactive full-screen git status TUI — collapsible sections, mouse support |

**Data sources:**
- **Branch + changes** — `git branch --show-current` and `git status --porcelain` in the current working directory; clicking the `+A ~M -D` segment toggles an inline file list
- **Model** — `model.id` from Claude Code's stdin JSON
- **Active tool** — most recent `tool_use` in the session JSONL; MCP tools shown as `MCP:server`
- **Context %** — `context_window.used_percentage` from Claude Code's stdin JSON; color: green < 60%, yellow 60–80%, red ≥ 80%
- **Monthly cost** — `GET /v1/organizations/cost_report` (requires `ANTHROPIC_ADMIN_API_KEY`; cached 5 min); omitted silently if key is absent

---

## Zero dependencies

brocode uses only Node.js standard library modules (`child_process`, `fs`, `path`, `os`). Nothing to `npm audit`. Nothing that breaks on a major version bump.

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
git clone https://github.com/your-username/brocode.git
cd brocode
npm install -g .   # install locally for testing
brocode            # test it
```

## License

[MIT](./LICENSE)

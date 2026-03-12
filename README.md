# brocode ✦

> Claude Code, extended.

brocode wraps the `claude` CLI with a startup welcome box and a persistent status bar showing git branch, active model, context window progress, and session cost — all in real time.

**[Website](https://your-username.github.io/brocode)** · [npm](https://www.npmjs.com/package/brocode) · [Issues](https://github.com/your-username/brocode/issues)

---

## What it looks like

On launch:

```
╭──────────────────────────────────────────────────────╮
│                                                      │
│  ✦  brocode  · claude code, extended                 │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│   ⎇  Branch    main                                  │
│   ◆  Model     Sonnet 4.6                            │
│   ◈  Usage     $0.83 today                           │
│   ⊞  Context   live in status bar ↓                  │
│                                                      │
╰──────────────────────────────────────────────────────╯
```

Status bar (bottom of Claude Code, updates live):

```
⎇ main  ·  ◆ Sonnet 4.6  ·  ████████░░░░  52%  ·  $0.34 session
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
| `brocode` | Renders the welcome box, configures the status line once, launches `claude` |
| `brocode-status` | Called by Claude Code on each refresh — reads context JSON from stdin, outputs one formatted line |

**Data sources:**
- **Branch** — `git branch --show-current` in the current working directory
- **Model** — scanned from the most recent session JSONL in `~/.claude/projects/`; also respects `$ANTHROPIC_MODEL`
- **Usage (today)** — sum of token costs across all today's sessions for this project
- **Context %** — `context_window.used_percentage` from Claude Code's stdin JSON (status line only)
- **Session cost** — estimated from `total_input_tokens` + `total_output_tokens` in Claude Code's stdin JSON

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

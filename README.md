# brocode

Extends [Claude Code](https://claude.ai/code) with a welcome box and persistent status bar showing:

- **Git branch** — current branch at a glance
- **Context progress bar** — live context window usage %
- **Session cost** — token spend for the current session

## What it looks like

On launch, a welcome box appears:

```
╭────────────────────────────────────────────────────╮
│                                                    │
│  ◉  brocode  · claude code, extended               │
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│    ⎇  Branch    main                               │
│    ⊞  Context   will appear in status bar below    │
│    ◈  Usage     $0.83 today                        │
│                                                    │
╰────────────────────────────────────────────────────╯
```

While Claude Code is running, the status bar at the bottom shows:

```
⎇ main  ·  ████████░░░░░░  52%  ·  $0.34 session
```

## Install

```bash
npm install -g brocode
```

Then use `brocode` instead of `claude`:

```bash
brocode             # same as: claude
brocode --resume    # same as: claude --resume
brocode "fix bug"   # same as: claude "fix bug"
```

All arguments are forwarded to `claude` unchanged.

On first run, `brocode` automatically adds the status bar to your `~/.claude/settings.json`.

## How it works

- `brocode` — wrapper script that renders the welcome box, configures the Claude Code status line, then launches `claude`
- `brocode-status` — script called by Claude Code on each status refresh; reads session context data from stdin and outputs the formatted status line

## Requirements

- Node.js ≥ 18
- Claude Code (`claude` must be in PATH)
- `git` (optional, for branch display)

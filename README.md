# claude-setup

My personal Claude Code configuration — plugins, MCP servers, hooks, and workflow settings. Clone this to bootstrap the same setup on any machine.

> **[View the full setup guide →](https://adarshkumar.github.io/claude-setup)**

---

## What's in here

| File | What it does |
|------|-------------|
| `settings.template.json` | Claude Code settings: MCP servers, plugins, hooks, permissions |
| `install.sh` | Bootstrap script — installs settings and checks dependencies |

---

## Quick start

```bash
git clone https://github.com/adarshkumar/claude-setup
cd claude-setup
bash install.sh
```

Then open `~/.claude/settings.json` and fill in your API keys:

```json
"env": {
  "ANTHROPIC_API_KEY": "sk-ant-...",
  "ANTHROPIC_ADMIN_API_KEY": "sk-ant-admin-..."  // optional
}
```

---

## MCP Servers

Configured via `settings.template.json`. All use `npx` — no global installs needed. Requires Node.js 18+.

| Server | Package | Purpose |
|--------|---------|---------|
| `context7` | `@upstash/context7-mcp` | Up-to-date library docs injected into context |
| `sequential-thinking` | `@modelcontextprotocol/server-sequential-thinking` | Structured multi-step reasoning |
| `playwright` | `@playwright/mcp@latest` | Headless browser automation |

---

## Plugins

All plugins are from the official Claude plugins marketplace. They are declared in `settings.template.json` under `enabledPlugins` and activate automatically when Claude Code loads the settings.

| Plugin | Purpose |
|--------|---------|
| `code-review` | Review PRs against project guidelines |
| `commit-commands` | Commit, push, and open PRs |
| `pr-review-toolkit` | Comprehensive PR review with specialized agents |
| `feature-dev` | Guided feature development with architecture focus |
| `code-simplifier` | Simplify code for clarity and maintainability |
| `security-guidance` | Security review and vulnerability detection |
| `hookify` | Create hooks to prevent unwanted Claude behaviors |
| `claude-code-setup` | Automation recommendations for Claude Code projects |
| `claude-md-management` | Audit and improve CLAUDE.md files |
| `frontend-design` | Production-grade frontend UI generation |
| `swift-lsp` | Swift language server (LSP) integration |
| `typescript-lsp` | TypeScript language server integration |
| `pyright-lsp` | Python type checking via Pyright |
| `gopls-lsp` | Go language server integration |

To install a missing plugin inside Claude Code:
```
/plugins install <name>@claude-plugins-official
```

---

## Hooks

The hooks in `settings.template.json` are provided by the **GSD** workflow system (see below). They register automatically when GSD is installed.

| Hook | Trigger | Purpose |
|------|---------|---------|
| `gsd-check-update.js` | `SessionStart` | Checks for GSD updates in the background |
| `gsd-context-monitor.js` | `PostToolUse` | Warns when context window is nearly full |
| `gsd-statusline.js` | Status line | Shows model, task, directory, context % |

Hook scripts live in `~/.claude/hooks/` after GSD is installed.

---

## GSD — Get Shit Done

GSD is a structured AI workflow system for Claude Code. It adds:

- `/gsd:new-project` — initialize a project with deep questioning → research → requirements → roadmap
- `/gsd:plan-phase` — research + plan a phase before execution
- `/gsd:execute-phase` — execute plans with atomic commits and state tracking
- `/gsd:progress` — check where you are and what's next
- and [many more commands](https://github.com/sjkaliski/gsd)

**Install GSD** inside Claude Code:

```
/plugins install gsd@claude-plugins-official
```

Or follow the [GSD docs](https://github.com/sjkaliski/gsd).

---

## Secrets — what's safe to commit

| Setting | In repo? | Notes |
|---------|----------|-------|
| `ANTHROPIC_API_KEY` | No — placeholder only | Fill in `~/.claude/settings.json` after install |
| `ANTHROPIC_ADMIN_API_KEY` | No — placeholder only | Optional, for org cost reporting |
| MCP server configs | Yes | All use `npx`, no credentials |
| Plugin list | Yes | Plugin names are public |
| Hook commands | Yes | Paths use `$HOME`, no secrets |

**Never commit your actual API keys.** The `settings.template.json` uses `YOUR_..._HERE` placeholders. Your real `~/.claude/settings.json` is not tracked by this repo.

---

## Updating

Pull the latest and re-run install:

```bash
git pull
bash install.sh
```

For GSD updates, inside Claude Code:
```
/gsd:update
```

---

## License

MIT

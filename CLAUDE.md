# claude-setup

This repo is a shareable snapshot of my Claude Code configuration.

## What this repo contains

- `settings.template.json` — Claude Code settings with API key placeholders
- `install.sh` — bootstrap script to install settings on a new machine
- `docs/` — GitHub Pages site
- `README.md` — setup guide

## Rules for editing this repo

### Never commit real secrets
`settings.template.json` must only contain `YOUR_..._HERE` placeholders for any API keys or tokens. The real `~/.claude/settings.json` is never tracked here.

### Keep settings.template.json in sync
When you add a new MCP server, plugin, or hook to your live `~/.claude/settings.json`, update `settings.template.json` to reflect it — replacing any credentials with placeholders.

### install.sh must be idempotent
Running `bash install.sh` multiple times should be safe. It must not overwrite an existing `~/.claude/settings.json` without user confirmation.

## Secrets reference

| Placeholder | Where to get it |
|------------|----------------|
| `YOUR_ANTHROPIC_API_KEY_HERE` | https://console.anthropic.com/settings/keys |
| `YOUR_ANTHROPIC_ADMIN_API_KEY_HERE` | https://console.anthropic.com/settings/admin-keys (optional) |

#!/usr/bin/env bash
# Claude Code AI Setup — Bootstrap Script
# Syncs settings.template.json to ~/.claude/settings.json
# Run: bash install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
TEMPLATE_FILE="$SCRIPT_DIR/settings.template.json"

echo ""
echo "  Claude Code AI Setup"
echo "  ───────────────────────────────────────────"
echo ""

# 1. Ensure ~/.claude exists
mkdir -p "$CLAUDE_DIR"

# 2. Merge or install settings
if [ -f "$SETTINGS_FILE" ]; then
  echo "  ⚠  $SETTINGS_FILE already exists."
  echo "  This script will NOT overwrite it automatically."
  echo ""
  echo "  To apply manually, review the diff and merge:"
  echo "    diff $SETTINGS_FILE $TEMPLATE_FILE"
  echo ""
  echo "  Or to force overwrite (destructive!):"
  echo "    cp $TEMPLATE_FILE $SETTINGS_FILE"
  echo ""
else
  cp "$TEMPLATE_FILE" "$SETTINGS_FILE"
  echo "  ✓  Installed settings to $SETTINGS_FILE"
  echo ""
  echo "  Next: open $SETTINGS_FILE and fill in your API keys:"
  echo "    - ANTHROPIC_API_KEY       → your Anthropic API key"
  echo "    - ANTHROPIC_ADMIN_API_KEY → optional, for org cost reporting"
  echo ""
fi

# 3. Install hook scripts
echo "  ─── Hooks ───────────────────────────────────"
echo ""
mkdir -p "$CLAUDE_DIR/hooks"

HOOKS_DIR="$SCRIPT_DIR/hooks"
if [ -d "$HOOKS_DIR" ]; then
  for hook in "$HOOKS_DIR"/*.js; do
    [ -f "$hook" ] || continue
    dest="$CLAUDE_DIR/hooks/$(basename "$hook")"
    cp "$hook" "$dest"
    chmod +x "$dest"
    echo "  ✓  $(basename "$hook") → $dest"
  done
else
  echo "  (no hooks/ directory found)"
fi
echo ""

# 4. GSD (Get Shit Done) workflow system
echo "  ─── GSD Workflow System ─────────────────────"
echo ""
if [ -d "$CLAUDE_DIR/get-shit-done" ]; then
  echo "  ✓  GSD already installed at $CLAUDE_DIR/get-shit-done"
else
  echo "  GSD is not installed. Install it inside Claude Code with:"
  echo ""
  echo "    /plugins install gsd@claude-plugins-official"
  echo ""
  echo "  Or follow: https://github.com/sjkaliski/gsd"
fi

# 4. Plugins
echo ""
echo "  ─── Plugins ─────────────────────────────────"
echo ""
echo "  The following plugins are configured in settings.template.json."
echo "  They are auto-enabled once Claude Code loads the settings."
echo ""
echo "  If any are missing, install them inside Claude Code:"
echo "    /plugins install <name>@claude-plugins-official"
echo ""
echo "  Plugins:"
grep '".*@claude-plugins-official": true' "$TEMPLATE_FILE" | sed 's/.*"\(.*\)@.*/    - \1/'
echo ""

# 5. MCP Servers
echo "  ─── MCP Servers ─────────────────────────────"
echo ""
echo "  MCP servers are configured in settings.template.json."
echo "  They use npx and require Node.js 18+."
echo ""
echo "  Servers:"
echo "    - context7           (@upstash/context7-mcp)"
echo "    - sequential-thinking(@modelcontextprotocol/server-sequential-thinking)"
echo "    - playwright         (@playwright/mcp@latest)"
echo ""
echo "  ─── Done ────────────────────────────────────"
echo ""
echo "  Launch Claude Code and everything should be active."
echo ""

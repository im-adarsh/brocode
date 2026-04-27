---
description: "Update brocode to the latest version from the main branch."
---
You are the brocode updater. The user has run /brocode:update.

## Update steps

1. Find the brocode plugin directory by running:
   ```
   find ~ -maxdepth 8 -name "plugin.json" -path "*/brocode/*" 2>/dev/null | head -5
   ```
   Pick the path whose `plugin.json` contains `"name": "brocode"`. The plugin directory is the parent of `.claude-plugin/`.

2. Confirm the directory exists and is a git repo:
   ```
   git -C <plugin-dir> remote get-url origin
   ```
   If it fails, print:
   ```
   Could not locate brocode plugin directory. Try reinstalling:
     claude plugin install brocode@im-adarsh --scope user
   ```
   Stop.

3. Print: `brocode → fetching latest from main…`

4. Fetch and hard-reset to origin/main (this replaces agents, commands, and all plugin files):
   ```
   git -C <plugin-dir> fetch origin main
   git -C <plugin-dir> reset --hard origin/main
   ```

5. Read the new version from `<plugin-dir>/.claude-plugin/plugin.json` and print:
   ```
   brocode updated to v<version>.
   Restart Claude Code for changes to take effect.
   ```

Stop.

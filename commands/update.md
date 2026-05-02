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

3. Check for local changes:
   ```
   git -C <plugin-dir> status --porcelain
   ```
   If output is empty: clean tree — skip to step 4 directly.

   If output is non-empty:
   ```
   brocode update: local changes detected in <N> files:
     M  agents/tpm.md
     M  commands/brocode.md
     (list each modified file)

   Options:
   [S] Stash — git stash, then update, then git stash pop
   [B] Backup — copy plugin dir to <plugin-dir>-backup-YYYYMMDD, then update
   [F] Force — discard local changes and update
   [A] Abort — cancel update, keep local changes
   ```
   Wait for user choice (S / B / F / A).

   - [S] Stash: `git -C <plugin-dir> stash` → proceed to step 4 → `git -C <plugin-dir> stash pop` after reset
   - [B] Backup: `cp -r <plugin-dir> <plugin-dir>-backup-$(date +%Y%m%d)` → proceed to step 4
   - [F] Force: print `⚠️ discarding local changes` → proceed to step 4
   - [A] Abort: print `brocode update cancelled. Local changes preserved.` → Stop.

4. Fetch and reset:
   ```
   PREV_SHA=$(git -C <plugin-dir> rev-parse HEAD)
   git -C <plugin-dir> fetch origin main
   git -C <plugin-dir> reset --hard origin/main  # brocode-confirmed
   ```
   Note: `# brocode-confirmed` comment allows the pre-tool-use hook (Sub-project H) to pass this command.

5. Validate after update:
   - Check `<plugin-dir>/.claude-plugin/plugin.json` is valid JSON: `python3 -c "import json,sys; json.load(open('<plugin-dir>/.claude-plugin/plugin.json'))"`
   - Check `<plugin-dir>/agents/` directory exists
   Print: `✅ brocode updated: <PREV_SHA[:7]> → v<new-version>`
   Print: `To rollback: git -C <plugin-dir> checkout <PREV_SHA>`
   Print: `Restart Claude Code for changes to take effect.`

Stop.

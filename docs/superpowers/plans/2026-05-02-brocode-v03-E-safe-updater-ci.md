# brocode v0.3-E: Safe Updater + .gitignore + CI Validation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard `git reset --hard` in update.md with a safe flow (detect dirty tree → stash/backup/force/abort). Add `.brocode/` to .gitignore. Create `scripts/validate.sh` that checks plugin.json, agent headers, dangerous commands, and broken internal references. Add GitHub Actions CI workflow.

**Architecture:** Modify `commands/update.md`, add `.brocode/` to `.gitignore`, create `scripts/validate.sh`, create `.github/workflows/validate.yml`. No agent files changed.

**Tech Stack:** Bash (validation script), GitHub Actions YAML (CI), Markdown (update.md).

---

### Task 1: Rewrite commands/update.md with safe update flow

**Files:**
- Modify: `commands/update.md`

- [ ] **Step 1: Read the current file**

Read `commands/update.md`. Current steps 1–2 find the plugin dir and verify it's a git repo. Step 4 runs `git reset --hard origin/main` without any dirty-tree check. The safe updater replaces step 3 onward.

- [ ] **Step 2: Write the new update.md**

Replace steps 3–5 with:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add commands/update.md
git commit -m "feat: replace git reset --hard with safe update flow in update.md"
```

---

### Task 2: Add .brocode/ to .gitignore

**Files:**
- Modify: `.gitignore` (create if missing)

- [ ] **Step 1: Check if .gitignore exists**

```bash
ls .gitignore 2>/dev/null && echo "exists" || echo "missing"
```

- [ ] **Step 2: Add entry**

If `.gitignore` exists, read it. Check if `.brocode/` is already present. If not, append:

```
# brocode runtime artifacts — never commit
.brocode/
```

If `.gitignore` does not exist, create it with just:

```
# brocode runtime artifacts — never commit
.brocode/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .brocode/ to .gitignore — runtime artifacts should not be committed"
```

---

### Task 3: Create scripts/validate.sh

**Files:**
- Create: `scripts/validate.sh`

- [ ] **Step 1: Create scripts/ directory**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Write validate.sh**

Create `scripts/validate.sh`:

```bash
#!/bin/bash
set -e
ERRORS=0

# 1. plugin.json parseable
python3 -c "import json,sys; json.load(open('.claude-plugin/plugin.json'))" 2>/dev/null \
  || { echo "❌ plugin.json: invalid JSON"; ERRORS=$((ERRORS+1)); }

# 2. Required agent fields
for f in agents/*.md; do
  grep -q "^# Role:" "$f" \
    || { echo "❌ $f: missing '# Role:' header"; ERRORS=$((ERRORS+1)); }
  grep -q "^\*\*Model:" "$f" \
    || { echo "❌ $f: missing '**Model:**' line"; ERRORS=$((ERRORS+1)); }
done

# 3. Dangerous command scan (unguarded git reset --hard outside update.md)
for f in agents/*.md commands/*.md; do
  if grep -q "git reset --hard" "$f" && [ "$f" != "commands/update.md" ]; then
    echo "⚠️  $f: contains 'git reset --hard' — ensure guard exists"
    ERRORS=$((ERRORS+1))
  fi
done

# 4. Broken internal agent references
grep -rh "agents/[a-z-]*\.md" agents/ commands/ CLAUDE.md 2>/dev/null \
  | grep -oE "agents/[a-z-]+\.md" | sort -u \
  | while read ref; do
    [ -f "$ref" ] || { echo "❌ broken reference: $ref"; ERRORS=$((ERRORS+1)); }
  done

# 5. .brocode/ in .gitignore
grep -q "^\.brocode/" .gitignore 2>/dev/null \
  || { echo "❌ .gitignore: missing .brocode/ entry"; ERRORS=$((ERRORS+1)); }

if [ $ERRORS -gt 0 ]; then
  echo "validate: $ERRORS error(s) found"
  exit 1
else
  echo "✅ validate: all checks passed"
fi
```

- [ ] **Step 3: Make executable and verify it runs**

```bash
chmod +x scripts/validate.sh
bash scripts/validate.sh
```

Expected: `✅ validate: all checks passed` (or warnings if any agent files are missing headers — fix those before committing).

- [ ] **Step 4: Commit**

```bash
git add scripts/validate.sh
git commit -m "feat: add scripts/validate.sh — CI validation for plugin.json, agent headers, and broken refs"
```

---

### Task 4: Create GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/validate.yml`

- [ ] **Step 1: Create directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write validate.yml**

Create `.github/workflows/validate.yml`:

```yaml
name: Validate brocode plugin
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run validation
        run: bash scripts/validate.sh
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/validate.yml
git commit -m "ci: add GitHub Actions workflow running scripts/validate.sh on push + PR"
```

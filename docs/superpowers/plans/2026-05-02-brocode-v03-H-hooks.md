# brocode v0.3-H: Hooks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two hooks: (1) PreToolUse guard blocking `git reset --hard` in Bash tool (exit 2, blocking), bypass via `# brocode-confirmed` comment; (2) PostToolUse validator warning when brocode agent/skill files are written with missing `# Role:` or `**Model:**` headers. Register both in `plugin.json`.

**Architecture:** Create `hooks/pre-tool-use-guard.sh` and `hooks/post-write-validate.sh`. Update `.claude-plugin/plugin.json` to add hooks array. The hooks directory already exists (empty).

**Tech Stack:** Bash scripts, JSON.

**Dependency:** Run after Sub-project G (hooks reference `skills/brocode/` paths in PostToolUse).

---

### Task 1: Create hooks/pre-tool-use-guard.sh

**Files:**
- Create: `hooks/pre-tool-use-guard.sh`

- [ ] **Step 1: Write the hook script**

Create `hooks/pre-tool-use-guard.sh`:

```bash
#!/bin/bash
# PreToolUse hook — blocks git reset --hard outside the explicit update flow
# Reads tool input from stdin as JSON (Claude Code hook protocol)
# Exit 2 = block the tool call with message. Exit 0 = allow.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('command',''))" 2>/dev/null)

if echo "$COMMAND" | grep -q "git reset --hard"; then
  # Allow if the command has a brocode-confirmed bypass comment
  if echo "$COMMAND" | grep -q "# brocode-confirmed"; then
    exit 0
  fi
  echo "🛡️ brocode guard: git reset --hard blocked."
  echo "Use /brocode:update to update safely (handles stash / backup / confirm)."
  echo "To bypass: add comment '# brocode-confirmed' on the line before the command."
  exit 2
fi

exit 0
```

- [ ] **Step 2: Make executable**

```bash
chmod +x hooks/pre-tool-use-guard.sh
```

- [ ] **Step 3: Test the script manually**

Test block case:
```bash
echo '{"command": "git reset --hard origin/main"}' | bash hooks/pre-tool-use-guard.sh
echo "exit code: $?"
```
Expected: prints guard message, exit code 2.

Test bypass case:
```bash
echo '{"command": "git reset --hard origin/main  # brocode-confirmed"}' | bash hooks/pre-tool-use-guard.sh
echo "exit code: $?"
```
Expected: no output, exit code 0.

Test unrelated command:
```bash
echo '{"command": "git status"}' | bash hooks/pre-tool-use-guard.sh
echo "exit code: $?"
```
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add hooks/pre-tool-use-guard.sh
git commit -m "feat: add hooks/pre-tool-use-guard.sh — blocks unguarded git reset --hard"
```

---

### Task 2: Create hooks/post-write-validate.sh

**Files:**
- Create: `hooks/post-write-validate.sh`

- [ ] **Step 1: Write the hook script**

Create `hooks/post-write-validate.sh`:

```bash
#!/bin/bash
# PostToolUse hook — warns when brocode agent/skill files are written with missing headers
# Reads tool result from stdin as JSON (Claude Code hook protocol)
# Exit 0 always (PostToolUse cannot block — warn only)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null)

# Only validate brocode plugin files
if ! echo "$FILE_PATH" | grep -qE "(agents/|skills/brocode/|commands/).*\.md$"; then
  exit 0
fi

ERRORS=0

# Agent files need Role + Model headers
if echo "$FILE_PATH" | grep -q "agents/"; then
  if ! grep -q "^# Role:" "$FILE_PATH" 2>/dev/null; then
    echo "⚠️ brocode validate: $FILE_PATH missing '# Role:' header"
    ERRORS=$((ERRORS+1))
  fi
  if ! grep -q "^\*\*Model:" "$FILE_PATH" 2>/dev/null; then
    echo "⚠️ brocode validate: $FILE_PATH missing '**Model:**' line"
    ERRORS=$((ERRORS+1))
  fi
fi

# Unguarded git reset --hard (outside update.md)
if ! echo "$FILE_PATH" | grep -q "update.md"; then
  if grep -q "git reset --hard" "$FILE_PATH" 2>/dev/null; then
    if ! grep -q "# brocode-confirmed" "$FILE_PATH" 2>/dev/null; then
      echo "⚠️ brocode validate: $FILE_PATH contains 'git reset --hard' without '# brocode-confirmed' guard"
    fi
  fi
fi

if [ $ERRORS -gt 0 ]; then
  echo "Run scripts/validate.sh to check all plugin files."
fi

exit 0  # PostToolUse cannot block — warn only
```

- [ ] **Step 2: Make executable**

```bash
chmod +x hooks/post-write-validate.sh
```

- [ ] **Step 3: Test the script manually**

Test agent file missing headers (create a temp file):
```bash
echo "# some content without Role or Model" > /tmp/test-agent.md
echo "{\"file_path\": \"agents/test.md\"}" | FILE_PATH="agents/test.md" bash -c 'INPUT=$(cat); FILE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('"'"'file_path'"'"',''))" 2>/dev/null); echo "path: $FILE_PATH"'
```

Simpler test — verify exit code is always 0 (PostToolUse never blocks):
```bash
echo '{"file_path": "agents/tpm.md"}' | bash hooks/post-write-validate.sh
echo "exit code: $?"
```
Expected: exit code 0.

Test with non-brocode file (should silently pass):
```bash
echo '{"file_path": "docs/README.md"}' | bash hooks/post-write-validate.sh
echo "exit code: $?"
```
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add hooks/post-write-validate.sh
git commit -m "feat: add hooks/post-write-validate.sh — warns on missing agent headers after Write/Edit"
```

---

### Task 3: Register hooks in plugin.json

**Files:**
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Read the current plugin.json**

Read `.claude-plugin/plugin.json`. Current content has: name, description, version, author, repository, license, keywords, recommendations. No hooks array yet.

- [ ] **Step 2: Add hooks array**

Add a `"hooks"` array to the JSON object. The hooks array must be added as a sibling key to `"recommendations"`. Updated plugin.json:

```json
{
  "name": "brocode",
  "description": "Multi-agent SDLC plugin for Claude Code. One command. Full engineering org in your terminal — investigates bugs, produces engineering specs, and implements features with PM, Designer, Tech Lead, Backend, Frontend, Mobile, Staff SWE, SRE, QA, and two Bar Raisers.",
  "version": "0.3.0",
  "author": {
    "name": "Adarsh Kumar"
  },
  "repository": "https://github.com/im-adarsh/brocode",
  "license": "MIT",
  "keywords": [
    "sdlc",
    "agents",
    "debugging",
    "investigation",
    "spec",
    "oncall",
    "implementation",
    "subagent",
    "code-review"
  ],
  "recommendations": [
    {
      "plugin": "superpowers",
      "marketplace": "claude-plugins-official",
      "reason": "Required for /brocode develop and /brocode review — subagent-driven implementation, systematic debugging, plan execution, git worktrees, and PR creation",
      "installHint": "claude plugin install superpowers@claude-plugins-official --scope user"
    }
  ],
  "hooks": [
    {
      "event": "PreToolUse",
      "tool": "Bash",
      "command": "hooks/pre-tool-use-guard.sh"
    },
    {
      "event": "PostToolUse",
      "tool": "Write,Edit",
      "command": "hooks/post-write-validate.sh"
    }
  ]
}
```

Note: version bumped from 0.2.0 to 0.3.0 to reflect the v0.3 release.

- [ ] **Step 3: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('valid JSON')"
```

Expected: `valid JSON`

- [ ] **Step 4: Run validate.sh**

```bash
bash scripts/validate.sh
```

Expected: `✅ validate: all checks passed`

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "feat: register hooks in plugin.json + bump version to 0.3.0"
```

# brocode v0.3: Guardrails, Config, and Artifacts — Design

**Date:** 2026-05-02

**Goal:** Six coordinated improvements making brocode safer, more configurable, more token-efficient, and more auditable. Addresses P0/P1 gaps from external review: safe updater, CI validation, configurable BR rounds, Designer removal, skill packaging, hooks, artifact model.

**Architecture:** Six independent sub-projects, each touching different files. Implemented sequentially F → K → E → G → H → I. Each ships independently and is safe to stop after any sub-project.

**Tech Stack:** Markdown (agent/skill files), Bash (hooks + validation script), JSON (config + plugin manifest), GitHub Actions YAML (CI).

---

## Sub-project F: Brocode Config + First-Run Onboarding

### Config file: `~/.brocode/config.json`

Created on first run. Read by TPM at every pre-flight before any agent dispatch.

**Schema:**
```json
{
  "br_rounds": {
    "product": 3,
    "engineering": 3,
    "final_check": 2
  },
  "models": {
    "tpm": "claude-sonnet-4-6",
    "pm": "claude-opus-4-7",
    "tech_lead": "claude-sonnet-4-6"
  },
  "superpowers_min_version": "5.0.0",
  "updated_at": "YYYY-MM-DD"
}
```

`br_rounds.product` — max BR rounds for product-spec.md and ux flows. Default 3.
`br_rounds.engineering` — max BR rounds for implementation-options.md, ops, test-cases. Default 3.
`br_rounds.final_check` — max rounds for engineering-spec.md + tasks.md final check. Default 2.
`models` — override agent-file model defaults. Keys must match agent role slugs (e.g. `"pm"`, `"tech_lead"`). TPM adds `Model override: <value>` line to instruction file when key matches role; sub-agent reads this line and uses it instead of the model specified in their agent file.

**TPM reads config at pre-flight:**
```
Read ~/.brocode/config.json. If missing, create with defaults (first run).
Use br_rounds values wherever BR loop max-round checks appear.
For each instruction file written: if config.models[<role-slug>] exists,
  add line: "Model override: <value>" — sub-agent uses this model instead of agent-file default.
```

All hardcoded `max 3 rounds` and `max 2 rounds` in tpm.md + brocode.md replaced with `max <config.br_rounds.X> rounds`.

### First-run onboarding

Triggered when `~/.brocode/repos.json` does not exist AND user runs `/brocode` with any input.

TPM runs onboarding before processing the request:

```
👋 brocode: first run detected. Need to register your repos before starting.

Provide repos in this format (one per line):
  <domain>: <path> — <description> (<tags>)

Examples:
  backend: /Users/you/code/api — Main REST API (node, express, postgres)
  mobile: /Users/you/code/ios — iOS app (swift, swiftui)
  web: /Users/you/code/dashboard — React dashboard (react, typescript)

Domain names are free-form. Use any name that makes sense for your stack.
Type 'done' when finished, or 'skip' to proceed without repos (investigate/spec only).
```

TPM parses input line by line. For each line:
- Extract domain, path, description, tags
- Validate path exists: `ls <path>` — if missing, warn and ask to re-enter
- Build repos.json entry

After all repos entered:
- Write `~/.brocode/repos.json`
- Write `~/.brocode/config.json` with defaults
- Print: `✅ brocode ready. Repos saved. Run /brocode <feature or bug> to start.`
- Continue with original user input (do not re-prompt)

If user typed 'skip': write config.json only, print warning that develop mode requires repos.

### User decision points

TPM surfaces key decisions during planning using `AskUserQuestion` tool — not after BR failure, but proactively when a choice has user-facing consequences.

**Trigger conditions** (any D-NNN with these signals):
- Two implementation options with fundamentally different architecture (e.g. sync vs async, build vs buy)
- Product direction fork where options produce different UX
- Scope ambiguity affecting effort by more than one size tier (M vs XL)

**Format:**
```
🤔 TPM → decision needed: [D-NNN title]

Option A: [name] — [1 sentence]. Est. effort: [size]
Option B: [name] — [1 sentence]. Est. effort: [size]
Option C: Let brocode decide (recommend: A — [brief reason])
```

TPM uses `AskUserQuestion` for blocking architectural choices. Non-blocking observations (style, minor tradeoffs) go to `tpm-logs.md` only — never surface trivial decisions to user.

**Files changed:**
- `agents/tpm.md` — add config read at pre-flight, replace hardcoded round limits, add first-run onboarding block, add user decision points protocol
- `commands/brocode.md` / `skills/brocode/SKILL.md` — add config read step, replace hardcoded round limits

---

## Sub-project K: Remove Designer Agent, PM Owns UX Flows

### What changes

Designer agent removed entirely. PM produces `product-spec.md` with a new `## 15. UX Flows` section covering all personas, flows, screen states, error states, and empty states.

Product BR reviews `product-spec.md` only (one artifact, one review loop).

### New PM output section — `## 15. UX Flows`

Added to `product-spec.md` template in `agents/pm.md`:

```markdown
## 15. UX Flows

### End-to-End Flow

```mermaid
flowchart TD
  %% Full system flow across ALL personas
  %% Entry points, decision nodes, error paths, terminal states
  %% Use subgraph per persona for clarity
  subgraph [Persona 1]
    A[Entry] --> B[Action] --> C{Decision}
    C -- success --> D[Success state]
    C -- error --> E[Error state]
  end
```

### [Persona 1: e.g., End User] — [Journey name from section 6]

| Step | User action | What they see | System state |
|------|-------------|---------------|-------------|
| 1 | [action] | [screen / component] | [background state] |

#### Error States
| Trigger | Message shown | Recovery CTA |
|---------|--------------|-------------|
| [network error] | [exact copy] | [retry / redirect] |

#### Empty / Loading States
| Context | What user sees | CTA |
|---------|---------------|-----|
| First-time use | [message + hint] | [primary CTA] |

### [Persona 2] ...
[same structure per persona from section 5]

### Design Decisions
| Decision | Options considered | Chosen | Rationale |
|----------|--------------------|--------|-----------|
```

### PM autonomous decision rules additions

PM closes without asking:
- Error message copy not specified → write it following plain, direct tone
- Empty state not described → design based on feature context
- Loading state not specified → skeleton for lists, spinner for actions
- Admin UX not specified → always include read-only monitoring view
- Support UX not specified → always include status lookup + audit trail

### Spec flow change

Step 1b (Designer dispatch) removed. PM produces `product-spec.md` including UX flows in one pass.

TPM instruction to PM updated:
```
What to do: Read brief.md. Produce product-spec.md including all 15 sections.
Section 15 (UX Flows) must cover every persona from section 5 with:
  - E2E mermaid flowchart
  - Step-by-step table per journey
  - Error states table
  - Empty/loading states table
```

Tech Lead instruction updated: reads `product-spec.md` only — no `ux.md` reference.

### Files changed
- `agents/pm.md` — add section 15 UX Flows to output template + autonomous decision rules
- `agents/tpm.md` — remove Designer dispatch step, remove Designer from org chart, update todo list (remove `🎨 Designer → ux.md`), update run summary table
- `commands/brocode.md` / `skills/brocode/modes/spec.md` — remove Step 1b Designer block, remove all `ux.md` references, update Product BR loop to review `product-spec.md` only
- `CLAUDE.md` — remove Designer from agent roster table
- `agents/designer.md` — DELETE

---

## Sub-project E: Safe Updater + .gitignore + CI Validation

### Safe updater (`commands/update.md`)

Replace `git reset --hard origin/main` with:

```
1. Detect dirty tree:
   git -C <plugin-dir> status --porcelain
   If output non-empty: show changed files, present options:

   brocode update: local changes detected in <N> files:
     M  agents/tpm.md
     M  commands/brocode.md

   Options:
   [S] Stash and update (git stash → fetch → reset → git stash pop)
   [B] Backup and update (cp -r <plugin-dir> <plugin-dir>-backup-YYYYMMDD → reset)
   [F] Force — discard local changes and update
   [A] Abort

   Wait for user choice. Execute accordingly.

2. If clean tree: proceed directly to fetch + reset (no prompt needed).

3. Fetch + apply:
   git -C <plugin-dir> fetch origin main
   PREV_SHA=$(git -C <plugin-dir> rev-parse HEAD)
   git -C <plugin-dir> reset --hard origin/main

4. Validate after update:
   - plugin.json parseable
   - agents/ directory exists with expected files
   - skills/brocode/SKILL.md exists (post Sub-project G)
   Print: ✅ brocode updated: v<prev> → v<new>

5. Print rollback note:
   To rollback: git -C <plugin-dir> checkout <PREV_SHA>
```

### `.gitignore` additions

```
# brocode runtime artifacts — never commit
.brocode/
```

### CI validation: `scripts/validate.sh`

```bash
#!/bin/bash
set -e
ERRORS=0

# 1. plugin.json schema
python3 -c "import json,sys; json.load(open('.claude-plugin/plugin.json'))" \
  || { echo "❌ plugin.json: invalid JSON"; ERRORS=$((ERRORS+1)); }

# 2. Required agent fields
for f in agents/*.md; do
  grep -q "^# Role:" "$f" || { echo "❌ $f: missing '# Role:' header"; ERRORS=$((ERRORS+1)); }
  grep -q "^\*\*Model:" "$f" || { echo "❌ $f: missing '**Model:**' line"; ERRORS=$((ERRORS+1)); }
done

# 3. Dangerous command scan (unguarded git reset --hard outside update.md)
for f in agents/*.md skills/brocode/**/*.md; do
  if grep -q "git reset --hard" "$f" && [ "$f" != "commands/update.md" ]; then
    echo "⚠️  $f: contains 'git reset --hard' — ensure guard exists"; ERRORS=$((ERRORS+1))
  fi
done

# 4. Broken internal agent references
grep -rh "agents/[a-z-]*\.md" agents/ commands/ skills/ CLAUDE.md 2>/dev/null \
  | grep -oE "agents/[a-z-]+\.md" | sort -u \
  | while read ref; do
    [ -f "$ref" ] || { echo "❌ broken reference: $ref"; ERRORS=$((ERRORS+1)); }
  done

# 5. .brocode/ in .gitignore
grep -q "^\.brocode/" .gitignore \
  || { echo "❌ .gitignore: missing .brocode/ entry"; ERRORS=$((ERRORS+1)); }

if [ $ERRORS -gt 0 ]; then
  echo "validate: $ERRORS error(s) found"
  exit 1
else
  echo "✅ validate: all checks passed"
fi
```

### CI workflow: `.github/workflows/validate.yml`

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

### Files changed
- `commands/update.md` — replace hard-reset with safe update flow
- `.gitignore` — add `.brocode/`
- new `scripts/validate.sh`
- new `.github/workflows/validate.yml`

---

## Sub-project G: Skill Packaging Migration

### New directory structure

```
skills/
  brocode/
    SKILL.md              ← entry point + routing (~50 lines)
    modes/
      investigate.md      ← full investigate flow
      spec.md             ← full spec flow
      develop.md          ← full develop flow
      review.md           ← review + export-adrs flow
      subcommands.md      ← repos, revise routing
```

### `skills/brocode/SKILL.md` content

```markdown
---
description: "Multi-agent SDLC. One command. Full engineering org."
---
{{args}}

## Quick Reference
**Modes:** INVESTIGATE · SPEC · DEVELOP · REVIEW · subcommands
**Step 0 subcommands:** revise · repos · develop · review · export-adrs
**Investigate flow:** Pre-flight → Tech Lead → parallel team → Engineering BR → spec → ADRs
**Spec flow:** Pre-flight → PM → Product BR gate → Tech Lead → parallel team → Engineering BR → spec → ADRs
**Read in full when:** First run in a session or ambiguous input

## Step 0: Route to mode file

Detect mode from input, then read ONLY the relevant mode file:

| Input matches | Load |
|--------------|------|
| bug / crash / error / broken / flaky / incident | `skills/brocode/modes/investigate.md` |
| feature / spec / build / design / add / new | `skills/brocode/modes/spec.md` |
| develop / implement / build it / code it | `skills/brocode/modes/develop.md` |
| review / PR URL / MR URL | `skills/brocode/modes/review.md` |
| repos / setup / revise / export-adrs | `skills/brocode/modes/subcommands.md` |

Do NOT read other mode files. Do NOT read the full commands/brocode.md.
After reading mode file, follow its instructions exactly.
```

### Token impact

| Before | After |
|--------|-------|
| 829 lines loaded every run | ~50 lines (SKILL.md) + ~150–300 lines (one mode file) |
| ~6,000 tokens per run | ~1,500–2,500 tokens per run |
| All modes always in context | Only active mode in context |

### Backwards compatibility

`commands/brocode.md` replaced with redirect:
```markdown
<!-- This file is superseded by skills/brocode/SKILL.md -->
<!-- Kept for backwards compatibility with cached invocations -->
See `skills/brocode/SKILL.md` for current orchestration logic.
```

`commands/update.md` stays unchanged — separate command, not a mode.

### Files changed
- new `skills/brocode/SKILL.md`
- new `skills/brocode/modes/investigate.md` (content moved from commands/brocode.md investigate section)
- new `skills/brocode/modes/spec.md` (content moved from spec section — updated per Sub-project K)
- new `skills/brocode/modes/develop.md` (content moved from develop section)
- new `skills/brocode/modes/review.md` (content moved from review section)
- new `skills/brocode/modes/subcommands.md` (content moved from subcommands section)
- `commands/brocode.md` — replaced with redirect stub
- `CLAUDE.md` — update Commands table paths

---

## Sub-project H: Hooks

### Hook 1: `hooks/pre-tool-use-guard.sh` (blocking)

Fires on `PreToolUse` for Bash tool. Checks command string for `git reset --hard`.

```bash
#!/bin/bash
# Reads tool input from stdin as JSON
# Blocks git reset --hard outside of explicit update flow

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('command',''))" 2>/dev/null)

if echo "$COMMAND" | grep -q "git reset --hard"; then
  echo "🛡️ brocode guard: git reset --hard blocked."
  echo "Use /brocode:update to update safely (handles stash/backup/confirm)."
  echo "To bypass: add comment '# brocode-confirmed' on the line before the command."
  exit 2
fi

exit 0
```

Bypass: if command contains `# brocode-confirmed` comment on preceding line — allows update.md to still function after user confirmation.

### Hook 2: `hooks/post-write-validate.sh` (non-blocking warning)

Fires on `PostToolUse` for Write and Edit tools. Validates written file if it's a brocode agent or skill file.

```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null)

# Only validate brocode plugin files
if ! echo "$FILE_PATH" | grep -qE "(agents/|skills/brocode/|commands/).*\.md$"; then
  exit 0
fi

ERRORS=0

# Agent files need Role + Model headers
if echo "$FILE_PATH" | grep -q "agents/"; then
  grep -q "^# Role:" "$FILE_PATH" \
    || { echo "⚠️ brocode validate: $FILE_PATH missing '# Role:' header"; ERRORS=$((ERRORS+1)); }
  grep -q "^\*\*Model:" "$FILE_PATH" \
    || { echo "⚠️ brocode validate: $FILE_PATH missing '**Model:**' line"; ERRORS=$((ERRORS+1)); }
fi

# Unguarded git reset --hard (not in update.md)
if echo "$FILE_PATH" | grep -qv "update.md"; then
  grep -q "git reset --hard" "$FILE_PATH" \
    && echo "⚠️ brocode validate: $FILE_PATH contains 'git reset --hard' — ensure guard exists"
fi

if [ $ERRORS -gt 0 ]; then
  echo "Run scripts/validate.sh to check all plugin files."
fi

exit 0  # PostToolUse cannot block — warn only
```

### `plugin.json` update

Add `"hooks"` array to `.claude-plugin/plugin.json`:

```json
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
```

### Files changed
- new `hooks/pre-tool-use-guard.sh`
- new `hooks/post-write-validate.sh`
- `.claude-plugin/plugin.json` — add hooks array

---

## Sub-project I: Artifact Model + Role Handoff Schema + Evidence Files

### Role handoff schema

Every sub-agent DONE/DONE_WITH_CONCERNS report must end with a structured `## Handoff` block. TPM validates presence before marking artifact complete.

```markdown
## Handoff
**Role:** [role-slug]
**Status:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
**Task:** [TASK-ID or artifact name]
**Files changed:**
- `path/to/file.ts` — [what changed]
**Tests run:** `[command]` → [N/N pass | FAIL: reason]
**Risks:** [any concern worth surfacing — or "none"]
**Decisions:** [D-NNN refs if any — or "none"]
**Next:** [role] — [what they need to do]
```

TPM validation rule (added to On ARTIFACT block in tpm.md):
```
Before marking artifact complete, verify DONE report contains ## Handoff block.
If missing: re-dispatch with "include ## Handoff block in your DONE report per agents/<role>.md".
```

Handoff block added to output format section of: `agents/tech-lead.md`, `agents/sre.md`, `agents/qa.md`, `agents/swe-backend.md`, `agents/swe-frontend.md`, `agents/swe-mobile.md`.

### Evidence artifacts

New required files per mode written during run:

**Investigate mode:** `.brocode/<id>/evidence.md`
```markdown
# Evidence Log
**Run ID:** [id]

## Reproduction
[Exact steps, commands, environment state]
[Reproducibility: always / flaky N% / condition X]

## Logs / Stack Traces
[Verbatim output — no paraphrasing]

## Timeline
| Time | Event |
|------|-------|
| [HH:MM] | [what happened] |

## Hypotheses Ruled Out
| Hypothesis | Why ruled out | Evidence |
|-----------|--------------|---------|
```
Written by: Tech Lead after domain investigation, before engineering-spec.md.

**Spec mode:** `.brocode/<id>/decisions.md`
```markdown
# Decision Log
**Run ID:** [id]

[All D-NNN blocks from tpm-logs.md, extracted here for standalone reference]
```
Written by: TPM at post-run, extracted from tpm-logs.md D-NNN blocks.

**Develop mode:** `.brocode/<id>/evidence.md`
```markdown
# Implementation Evidence
**Run ID:** [id]

## Test Results
| Domain | Command | Result |
|--------|---------|--------|
| backend | npm test | 42/42 pass |

## PR Links
| Domain | PR URL | Status |
|--------|--------|--------|

## Worktree Map
| Domain | Branch | Worktree path | Status |
|--------|--------|---------------|--------|
```
Written by: TPM at post-run after all domains complete.

### `.brocode/` project directory

Add to `.gitignore` (covered in Sub-project E). Runtime structure:
```
.brocode/
  <id>/
    brief.md
    product-spec.md       ← PM (includes UX flows)
    implementation-options.md
    investigation.md
    sre.md
    test-cases.md
    engineering-spec.md
    tasks.md
    evidence.md           ← NEW (investigate + develop modes)
    decisions.md          ← NEW (spec mode)
    tpm-logs.md
    brocode.md
    instructions/
    threads/
    br/
    adrs/
```

### Files changed
- `agents/tpm.md` — add handoff validation to On ARTIFACT block, add evidence.md writing to post-run, add decisions.md extraction to post-run
- `agents/tech-lead.md` — add Handoff block to investigation.md + implementation-options.md output format
- `agents/sre.md`, `agents/qa.md`, `agents/swe-backend.md`, `agents/swe-frontend.md`, `agents/swe-mobile.md` — add Handoff block to output format
- `skills/brocode/modes/investigate.md` — add evidence.md writing step
- `skills/brocode/modes/develop.md` — add evidence.md writing step post-run
- `skills/brocode/modes/spec.md` — add decisions.md extraction step post-run
- `CLAUDE.md` — update context directory structure

---

## Implementation Order

| Order | Sub | Dependency | Risk |
|-------|-----|-----------|------|
| 1 | F — Config + Onboarding | None | Low |
| 2 | K — Remove Designer | None | Low |
| 3 | E — Safe Updater + CI | None | Low |
| 4 | G — Skill Packaging | E must pass CI first | Medium |
| 5 | H — Hooks | G (hooks reference skills/ paths) | Low |
| 6 | I — Artifact Model | G (evidence files in mode files) | Medium |

Each sub-project is independently shippable. Stop after any step and brocode remains functional.

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| config.json missing on non-first run | TPM recreates with defaults, logs warning |
| User provides invalid repo path during onboarding | TPM warns, asks to re-enter — does not proceed until valid or skip |
| Designer referenced in old `.brocode/<id>/` run dirs | Old runs unaffected — TPM only dispatches Designer if `agents/designer.md` exists |
| `skills/brocode/SKILL.md` not found | Claude falls back to `commands/brocode.md` redirect stub |
| Hook blocks legitimate `git reset --hard` | Add `# brocode-confirmed` comment before command |
| PostToolUse fires on non-brocode file | Script exits 0 immediately — no false positives |
| Handoff block missing from DONE report | TPM re-dispatches with explicit instruction — max 1 retry |
| Agent file deleted and referenced in validate.sh | CI fails, PR blocked — correct behavior |

---

## What Is Not In Scope

- Cross-tool portability (AGENTS.md, Codex/Copilot compatibility) — Sub-project J
- GitHub issue intake (`/brocode investigate issue <url>`) — Sub-project J
- Full artifact archiving / OpenSpec-style change folders — future
- Changing which model Claude Code uses for the TPM itself
- Automatic PR comment posting from TPM/BR

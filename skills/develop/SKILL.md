---
name: sdlc-develop
description: Use when user wants to implement an approved spec — reads 08-final-spec.md and 09-tasks.md, converts to superpowers plan, dispatches sub-agents per task, runs 2-stage review, raises PR
---

# SDLC Develop

Takes an approved `08-final-spec.md` + `09-tasks.md` and executes implementation end-to-end using the superpowers subagent-driven-development workflow.

## Prerequisites

1. `08-final-spec.md` exists and is approved
2. `09-tasks.md` exists (written by Engineering Bar Raiser)
3. superpowers plugin is installed — check: `claude plugin list | grep superpowers`
   - If missing: `claude plugin install superpowers@claude-plugins-official --scope user` then restart Claude Code

## Step 0: Load Context

Read the following files before doing anything:
- `.sdlc/<id>/08-final-spec.md`
- `.sdlc/<id>/09-tasks.md`
- `.brocode-repos.json` — get repo paths for each domain

Identify which domains are involved: `backend` / `web` / `mobile`. Each domain gets its own git branch and its own task sequence.

## Step 1: Set Up Worktrees

**Invoke `superpowers:using-git-worktrees`** for each domain that has tasks.

For each domain (backend / web / mobile):
```bash
# Navigate to the domain repo (from .brocode-repos.json)
cd <domain-repo-path>

# Create worktree for this spec
git worktree add ../brocode-<spec-id>-<domain> -b brocode/<spec-id>/<domain>
```

TPM logs:
```
🟢  📋 TPM  →  created worktree brocode/<spec-id>/backend at <path>
```

## Step 2: Convert Tasks to Superpowers Plan

For each domain, convert its tasks from `09-tasks.md` into a superpowers-compatible plan file.

Save to: `<domain-repo-path>/docs/superpowers/plans/<spec-id>-<domain>.md`

Plan file format (follows `superpowers:writing-plans` spec):

```markdown
# [Spec Title] — [Domain] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [from 08-final-spec.md summary]

**Architecture:** [from 08-final-spec.md approved implementation approach]

**Tech Stack:** [inferred from repo + spec]

**Spec reference:** .sdlc/<id>/08-final-spec.md

---

[Each task from 09-tasks.md for this domain, converted to superpowers task format with file paths, code sketches, test steps, and commit steps]
```

**Task conversion rules:**
- Every task from `09-tasks.md` must map to exactly one plan task
- Each plan task must include: exact file paths, code sketch, test command, commit command
- No placeholders — if `09-tasks.md` says "add endpoint", write the actual function signature
- If a task needs information not in the spec, read the codebase first, then fill in

## Step 3: Execute — Subagent-Driven Development

**Invoke `superpowers:subagent-driven-development`** for each domain plan.

This drives the full execution loop:
1. Dispatch implementer sub-agent per task (fresh context, full task text + codebase context)
2. Implementer implements, writes tests (TDD), commits
3. Dispatch spec compliance reviewer — verifies code matches `08-final-spec.md` ACs
4. Dispatch code quality reviewer — checks quality, patterns, no regressions
5. Fix loops until both reviewers approve
6. Mark task complete, proceed to next

TPM logs at each transition:
```
🟢  ⚙️  Backend Task 1/5  →  implementing: POST /api/auth/token endpoint
✅  ⚙️  Backend Task 1/5  →  spec review passed, quality review passed
🟢  ⚙️  Backend Task 2/5  →  implementing: token refresh logic
⚠️  ⚙️  Backend Task 2/5  →  spec gap found — missing rate limiting. fixing.
✅  ⚙️  Backend Task 2/5  →  approved
```

### Debugging during implementation

When an implementer sub-agent returns `BLOCKED` or `DONE_WITH_CONCERNS` on a bug:

**Invoke `superpowers:systematic-debugging`** — pass it:
- The exact error / unexpected behavior
- The code path involved
- Evidence gathered so far

Do NOT propose a fix until systematic-debugging completes Phase 1 (root cause confirmed).

## Step 4: Finish Each Domain Branch

After all tasks for a domain complete:

**Invoke `superpowers:finishing-a-development-branch`** — this:
1. Runs full test suite
2. Presents options: merge locally / push + PR / keep / discard
3. Default for brocode: **push + create PR** per domain

PR title format: `feat(<domain>): <spec-id> — <spec-title>`

PR body includes:
- Link to `08-final-spec.md`
- Link to `09-tasks.md`
- Task completion summary
- Test coverage summary from `06-test-cases.md`

TPM logs:
```
✅  📋 TPM  →  backend PR raised: feat(backend): spec-20260426-oauth — Google OAuth SSO
✅  📋 TPM  →  web PR raised: feat(web): spec-20260426-oauth — Google OAuth SSO
```

## Step 5: Update 09-tasks.md Status

After each task completes, update status in `.sdlc/<id>/09-tasks.md`:
- `[ ]` → `[x]` for completed tasks
- Add PR link next to each domain group header

## Iron Laws

1. No implementation starts without `08-final-spec.md` approved
2. No implementation starts without superpowers installed — check first
3. Each domain gets its own worktree and its own PR
4. No fix without root cause — invoke `superpowers:systematic-debugging` when blocked
5. Spec compliance review before code quality review (never reverse)
6. Never skip reviewer loops — approved means both reviewers passed

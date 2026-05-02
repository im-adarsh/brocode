# Develop Mode Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add effort estimation, Definition of Done gate, per-task QA gate, migration safety rules, and spec-grounded PR descriptions to brocode's develop mode.

**Architecture:** Additive markdown edits to `agents/tech-lead.md` (tasks.md template + authoring rules) and `commands/brocode.md` (develop flow orchestration). No new files, no new agents, no new commands.

**Tech Stack:** Markdown. Both files are instruction documents for Claude agents — changes are prose + structured text, not executable code.

---

## File Map

| File | Lines touched | What changes |
|------|--------------|--------------|
| `agents/tech-lead.md` | 306–342 (task template) | Add `**Effort:**` + `**DoD:**` fields to task block |
| `agents/tech-lead.md` | 344–348 (quality bar) | Add effort + DoD + migration authoring rules |
| `commands/brocode.md` | 117–127 (develop flow) | Add effort summary, DoD gate, QA gate, PR description step |

Tasks 1 and 2 touch different files — run in either order. Task 3 builds on Task 2's DoD gate text (references it in the flow). Task 4 is fully independent.

---

### Task 1: Add Effort + DoD fields to tasks.md template in tech-lead.md

**Files:**
- Modify: `agents/tech-lead.md:306-348`

This task adds `**Effort:**` and `**DoD:**` fields to the example task block inside the tasks.md template, and adds three new quality bar rules.

Context: `agents/tech-lead.md` is a markdown instruction file for the Tech Lead Claude agent. The `tasks.md` template starts at line 295 and shows an example task `TASK-BE-01`. The quality bar is at lines 344–348.

- [ ] **Step 1: Read the current task template block**

Run:
```bash
sed -n '295,349p' agents/tech-lead.md
```
Expected: Shows the tasks.md template with `TASK-BE-01` example and quality bar ending with "Dependencies are explicit — no implicit ordering"

- [ ] **Step 2: Add `**Effort:**` and `**DoD:**` fields to the TASK-BE-01 example block**

In `agents/tech-lead.md`, replace the existing `TASK-BE-01` example block (lines 306–328). The new block adds `**Effort:**` after `**Satisfies AC:**` and `**DoD:**` after `**Test cases from QA:**`:

Old content (exact match):
```
### TASK-BE-01: [Short title]
**Domain:** backend
**Status:** [ ]
**Depends on:** none
**Satisfies AC:** AC-3, AC-5

**Files:**
- Create: `src/api/auth/token.ts`
- Modify: `src/api/routes.ts:45-52`
- Test: `tests/api/auth/token.test.ts`

**Implementation:**
- Endpoint: `POST /api/auth/token`
- Handler signature: `async function handleTokenRequest(req: Request): Promise<TokenResponse>`
- Validates: `{ code: string, redirect_uri: string }` — returns 400 if missing
- Returns: `{ access_token, refresh_token, expires_in }`
- Error cases: 400 bad request, 401 invalid code, 500 internal

**Test cases from QA:**
- Happy path: valid code → tokens returned
- Invalid code → 401
- Missing redirect_uri → 400
```

New content:
```
### TASK-BE-01: [Short title]
**Domain:** backend
**Status:** [ ]
**Depends on:** none
**Satisfies AC:** AC-3, AC-5
**Effort:** S | M | L | XL

**Files:**
- Create: `src/api/auth/token.ts`
- Modify: `src/api/routes.ts:45-52`
- Test: `tests/api/auth/token.test.ts`

**Implementation:**
- Endpoint: `POST /api/auth/token`
- Handler signature: `async function handleTokenRequest(req: Request): Promise<TokenResponse>`
- Validates: `{ code: string, redirect_uri: string }` — returns 400 if missing
- Returns: `{ access_token, refresh_token, expires_in }`
- Error cases: 400 bad request, 401 invalid code, 500 internal

**Test cases from QA:**
- Happy path: valid code → tokens returned
- Invalid code → 401
- Missing redirect_uri → 400

**DoD:**
- [ ] [any per-task requirement beyond baseline — e.g. "feature flag wired and tested off"]
```

- [ ] **Step 3: Add effort size guide and new quality bar rules**

In `agents/tech-lead.md`, replace the quality bar block (lines 344–348). Old content (exact match):

```
**Quality bar:**
- Zero vague tasks — "implement the auth flow" is not a task
- Every task maps to at least one AC
- Every task has exact file paths and concrete function signatures
- Dependencies are explicit — no implicit ordering
```

New content:
```
**Quality bar:**
- Zero vague tasks — "implement the auth flow" is not a task
- Every task maps to at least one AC
- Every task has exact file paths and concrete function signatures
- Dependencies are explicit — no implicit ordering
- Every task has `**Effort:**` — use: S (< 1h, 1–2 files) · M (1–3h, multi-file) · L (3–8h, cross-service/schema) · XL (8h+, needs breakdown first)
- Every task has `**DoD:**` — list any requirements beyond the fixed baseline (tests pass, commit exists, no TODO/FIXME in diff). Omit the field if no extras needed.
- Migration tasks MUST add to `**DoD:**`: down migration written and tested · migration tested on staging data volume · migration safe under concurrent writes (no full-table lock) · rollback procedure tested in staging (see sre.md)
```

- [ ] **Step 4: Verify the edit looks correct**

Run:
```bash
sed -n '295,360p' agents/tech-lead.md
```
Expected: task template shows `**Effort:** S | M | L | XL` line after `**Satisfies AC:**`, `**DoD:**` block after test cases, and quality bar has 7 bullets with effort guide + DoD rule + migration rule.

- [ ] **Step 5: Commit**

```bash
git add agents/tech-lead.md
git commit -m "feat: add Effort + DoD fields to tasks.md template and quality bar"
```

---

### Task 2: Add effort summary + DoD gate to develop flow in brocode.md

**Files:**
- Modify: `commands/brocode.md:107-127`

This task adds two things to the develop flow: (1) effort summary printed at develop-start before worktrees spin up, (2) DoD gate step inside the per-task loop between implementer DONE and spec compliance review.

Context: `commands/brocode.md` is the main brocode orchestration instruction. The develop section (lines 107–127) shows a numbered list of steps per domain. `superpowers:subagent-driven-development` at step 3 handles the per-task loop including spec/quality review. We need to add the effort summary before step 1 and the DoD gate as a new sub-step inside step 3.

- [ ] **Step 1: Read the current develop section**

Run:
```bash
sed -n '107,128p' commands/brocode.md
```
Expected: Shows the develop/implement block with steps 1–6.

- [ ] **Step 2: Replace the develop flow block with effort summary + DoD gate**

In `commands/brocode.md`, replace the develop flow block. Old content (exact match):

```
- Scan `.brocode/` for dirs with `engineering-spec.md` + `tasks.md`. If multiple, list and ask which.
- Read `~/.brocode/repos.json` for repo paths.
- For each domain with tasks (backend / web / mobile):
  1. Invoke `superpowers:using-git-worktrees` — create isolated worktree in that domain's repo for branch `brocode/<spec-id>-<domain>`
  2. Invoke `superpowers:writing-plans` — convert domain tasks from `tasks.md` into a superpowers plan at `docs/superpowers/plans/<spec-id>-<domain>.md` inside the worktree
  3. Invoke `superpowers:subagent-driven-development` — execute plan task by task inside the worktree with 2-stage review (spec compliance + code quality) per task
  4. Invoke `superpowers:finishing-a-development-branch` — run tests, push branch, create PR
  5. Delete the worktree after PR is created: `git worktree remove --force <worktree-path>`
  6. Print: `📋 TPM → <domain> PR raised, worktree cleaned up`
- Run domains in parallel where possible (independent repos).
- Stop.
```

New content:
```
- Scan `.brocode/` for dirs with `engineering-spec.md` + `tasks.md`. If multiple, list and ask which.
- Read `~/.brocode/repos.json` for repo paths.
- Read `tasks.md`. Tally `**Effort:**` fields and print:
  ```
  📋 TPM → effort summary: <N>S <N>M <N>L <N>XL — est. <range>h across <N> tasks
  ```
  Effort ranges: S = 0.5–1h · M = 1–3h · L = 3–8h · XL = 8h+. Sum low ends for min, high ends for max.
  If any XL task found, print: `⚠️  TPM → XL task detected: <TASK-ID> — consider breaking down before starting`
- For each domain with tasks (backend / web / mobile):
  1. Invoke `superpowers:using-git-worktrees` — create isolated worktree in that domain's repo for branch `brocode/<spec-id>-<domain>`
  2. Invoke `superpowers:writing-plans` — convert domain tasks from `tasks.md` into a superpowers plan at `docs/superpowers/plans/<spec-id>-<domain>.md` inside the worktree
  3. Invoke `superpowers:subagent-driven-development` — execute plan task by task inside the worktree. Per-task loop:
     a. Implementer subagent implements + self-reviews
     b. **DoD gate** — before spec compliance review, verify:
        - At least one commit exists for this task (`git log --oneline -1` non-empty)
        - Tests pass: run command from `~/.brocode/wiki/<repo-slug>/test-strategy.md`; fall back to repo tags in `~/.brocode/repos.json` (node → `npm test`, python → `pytest`, go → `go test ./...`)
        - No TODO/FIXME in changed files: `git diff HEAD~1 -- . | grep -E "TODO|FIXME"`
        - All `**DoD:**` per-task items confirmed by implementer in DONE report
        If any check fails: re-dispatch implementer with specific failure. Max 2 retries → escalate to user.
        Print on pass: `✅ TPM → DoD gate passed: <TASK-ID>`
        Print on fail: `❌ TPM → DoD gate failed: <TASK-ID> — <reason>. Re-dispatching implementer.`
     c. Spec compliance review
     d. Code quality review
  4. Invoke `superpowers:finishing-a-development-branch` — run tests, push branch, create PR
  5. Delete the worktree after PR is created: `git worktree remove --force <worktree-path>`
  6. Print: `📋 TPM → <domain> PR raised, worktree cleaned up`
- Run domains in parallel where possible (independent repos).
- Stop.
```

- [ ] **Step 3: Verify the edit looks correct**

Run:
```bash
sed -n '107,155p' commands/brocode.md
```
Expected: develop section shows effort summary block before domain loop, and step 3 is expanded with sub-steps a/b/c/d including DoD gate with all 4 checks.

- [ ] **Step 4: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: add effort summary at develop-start and DoD gate per task"
```

---

### Task 3: Add QA gate to per-task loop in brocode.md

**Files:**
- Modify: `commands/brocode.md` — develop flow step 3 (added in Task 2)

This task inserts a QA gate sub-step between the DoD gate and spec compliance review. Depends on Task 2 (the DoD gate sub-steps must exist first).

Context: After Task 2, step 3 of the develop loop has sub-steps a (implementer), b (DoD gate), c (spec review), d (quality review). We add sub-step b2 (QA gate) between b and c.

- [ ] **Step 1: Read the current develop step 3 block**

Run:
```bash
grep -n "DoD gate\|QA gate\|Spec compliance\|Code quality\|spec compliance\|quality review\|implementer subagent" commands/brocode.md | head -20
```
Expected: Shows lines with "DoD gate", "Spec compliance review", "Code quality review" from the develop section.

- [ ] **Step 2: Replace step 3 sub-steps to insert QA gate**

In `commands/brocode.md`, replace the step 3 block. Old content (exact match — added in Task 2):

```
  3. Invoke `superpowers:subagent-driven-development` — execute plan task by task inside the worktree. Per-task loop:
     a. Implementer subagent implements + self-reviews
     b. **DoD gate** — before spec compliance review, verify:
        - At least one commit exists for this task (`git log --oneline -1` non-empty)
        - Tests pass: run command from `~/.brocode/wiki/<repo-slug>/test-strategy.md`; fall back to repo tags in `~/.brocode/repos.json` (node → `npm test`, python → `pytest`, go → `go test ./...`)
        - No TODO/FIXME in changed files: `git diff HEAD~1 -- . | grep -E "TODO|FIXME"`
        - All `**DoD:**` per-task items confirmed by implementer in DONE report
        If any check fails: re-dispatch implementer with specific failure. Max 2 retries → escalate to user.
        Print on pass: `✅ TPM → DoD gate passed: <TASK-ID>`
        Print on fail: `❌ TPM → DoD gate failed: <TASK-ID> — <reason>. Re-dispatching implementer.`
     c. Spec compliance review
     d. Code quality review
```

New content:
```
  3. Invoke `superpowers:subagent-driven-development` — execute plan task by task inside the worktree. Per-task loop:
     a. Implementer subagent implements + self-reviews
     b. **DoD gate** — before spec compliance review, verify:
        - At least one commit exists for this task (`git log --oneline -1` non-empty)
        - Tests pass: run command from `~/.brocode/wiki/<repo-slug>/test-strategy.md`; fall back to repo tags in `~/.brocode/repos.json` (node → `npm test`, python → `pytest`, go → `go test ./...`)
        - No TODO/FIXME in changed files: `git diff HEAD~1 -- . | grep -E "TODO|FIXME"`
        - All `**DoD:**` per-task items confirmed by implementer in DONE report
        If any check fails: re-dispatch implementer with specific failure. Max 2 retries → escalate to user.
        Print on pass: `✅ TPM → DoD gate passed: <TASK-ID>`
        Print on fail: `❌ TPM → DoD gate failed: <TASK-ID> — <reason>. Re-dispatching implementer.`
     c. **QA gate** — dispatch QA sub-agent (`agents/qa.md`) with:
        - Worktree path
        - Full task block from `tasks.md` (the task being verified)
        - Relevant test cases from `.brocode/<id>/test-cases.md` for this task (match by task ID or domain)
        - Test command from `~/.brocode/wiki/<repo-slug>/test-strategy.md`
        QA runs tests, cross-checks coverage against `test-cases.md`, identifies missing test cases.
        QA reports PASS (all test cases covered, suite green) or FAIL (missing tests listed, failures quoted).
        On FAIL: re-dispatch implementer with QA findings. Max 2 retries → escalate to user.
        Print on pass: `✅ TPM → QA passed: <TASK-ID> — <N>/<N> test cases covered, suite green`
        Print on fail: `❌ TPM → QA failed: <TASK-ID> — <N> missing test cases. Routing back to implementer.`
     d. Spec compliance review
     e. Code quality review
```

- [ ] **Step 3: Verify the edit looks correct**

Run:
```bash
grep -n "QA gate\|QA passed\|QA failed\|Spec compliance\|quality review\|DoD gate" commands/brocode.md | head -20
```
Expected: Shows "DoD gate" (step b), "QA gate" (step c), "Spec compliance review" (step d), "Code quality review" (step e) — all present and in order.

- [ ] **Step 4: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: add QA gate per task between DoD gate and spec compliance review"
```

---

### Task 4: Add PR description generation + tool::brocode label to develop flow

**Files:**
- Modify: `commands/brocode.md` — develop flow steps 4–6 (the finishing section)

This task replaces the plain `finishing-a-development-branch` call with a pre-PR description generation step and adds the `tool::brocode` label. Independent of Tasks 2 and 3.

Context: After Task 2/3, step 4 is `finishing-a-development-branch`. We insert a new step 4 (generate PR description) before the current step 4, shifting finishing to step 5. Label is applied via `gh pr create --label "tool::brocode"` or `glab mr create --label "tool::brocode"` — TPM detects platform from `git remote get-url origin`.

- [ ] **Step 1: Read the finishing steps in the develop block**

Run:
```bash
grep -n "finishing-a-development\|worktree remove\|PR raised\|worktree cleaned" commands/brocode.md | head -10
```
Expected: Shows the finishing-a-development-branch line and the worktree cleanup line with their line numbers.

- [ ] **Step 2: Replace steps 4–6 to add PR description generation**

In `commands/brocode.md`, replace the finishing steps. Old content (exact match):

```
  4. Invoke `superpowers:finishing-a-development-branch` — run tests, push branch, create PR
  5. Delete the worktree after PR is created: `git worktree remove --force <worktree-path>`
  6. Print: `📋 TPM → <domain> PR raised, worktree cleaned up`
```

New content:
```
  4. Generate PR description from spec artifacts before finishing:
     - Read `.brocode/<id>/engineering-spec.md` sections 1 (Problem Statement) and 11 (Rollback)
     - Read completed tasks for this domain from `.brocode/<id>/tasks.md`
     - Read test cases for this domain from `.brocode/<id>/test-cases.md`
     - Read `git log --oneline` in worktree
     - Compose description with required sections:
       ```
       ## Summary
       [engineering-spec.md section 1 — problem statement]

       ## Changes
       [one bullet per completed task for this domain]

       ## Test plan
       [test cases for this domain from test-cases.md]

       ## Rollback
       [engineering-spec.md section 11]

       ## References
       Spec: .brocode/<id>/engineering-spec.md
       brocode run: <spec-id>
       ```
     - If any section source is missing: fill with `[NOT PROVIDED — update before merge]` and print warning
     - Detect platform: `git remote get-url origin` — if contains `github.com` use `gh`, if contains `gitlab` use `glab`
     - Apply label `tool::brocode` at PR creation: `gh pr create --label "tool::brocode" --body "<description>"` or `glab mr create --label "tool::brocode" --description "<description>"`
     - Print: `📋 TPM → PR description generated from spec artifacts`
     - Print: `🏷️  TPM → label applied: tool::brocode`
  5. Invoke `superpowers:finishing-a-development-branch` — run tests, push branch, create PR using the generated description and label
  6. Delete the worktree after PR is created: `git worktree remove --force <worktree-path>`
  7. Print: `✅ TPM → <domain> PR raised, worktree cleaned up`
```

- [ ] **Step 3: Verify the edit looks correct**

Run:
```bash
grep -n "PR description\|tool::brocode\|finishing-a-development\|worktree remove\|PR raised" commands/brocode.md | head -15
```
Expected: Shows "PR description generated", "tool::brocode", "finishing-a-development-branch", "worktree remove", "PR raised" — all present and in order.

- [ ] **Step 4: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: add spec-grounded PR description + tool::brocode label before finishing branch"
```

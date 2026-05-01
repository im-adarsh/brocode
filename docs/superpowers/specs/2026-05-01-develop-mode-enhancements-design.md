# Develop Mode Enhancements Design

**Date:** 2026-05-01

**Goal:** Five targeted improvements to brocode's develop mode — effort visibility, quality gates, QA verification per task, migration safety, and spec-grounded PR descriptions.

**Architecture:** Additive edits to `commands/brocode.md` (develop flow orchestration) and `agents/tech-lead.md` (tasks.md authoring rules). No new files, no new commands, no new agents.

**Tech Stack:** Markdown edits to existing agent files. No new dependencies.

---

## Mechanism 1: Effort Estimation

**Location:** `agents/tech-lead.md` — tasks.md template; `commands/brocode.md` — develop-start block.

**Current state:** Tech Lead writes tasks with files, implementation notes, and test cases but no time estimate. TPM starts develop mode with no visibility into total scope.

**New rule:** Tech Lead adds `**Effort:** S | M | L | XL` to every task block in `tasks.md`.

| Size | Meaning |
|------|---------|
| S | < 1h — isolated change, 1–2 files, clear spec |
| M | 1–3h — multi-file, moderate integration |
| L | 3–8h — cross-service, schema change, or complex logic |
| XL | 8h+ — needs breakdown or spike first |

At develop-start, TPM scans `tasks.md`, tallies sizes, prints:
```
📋 TPM → effort summary: 2S 3M 1L 0XL — est. 6–14h across 6 tasks
```

If any XL task found:
```
⚠️  TPM → XL task detected: TASK-BE-03 — consider breaking down before starting
```

**Files changed:**
- `agents/tech-lead.md` — add `**Effort:**` field + size guide to tasks.md template
- `commands/brocode.md` — add effort summary print at develop-start

---

## Mechanism 2: Definition of Done Gate

**Location:** `commands/brocode.md` — develop task loop; `agents/tech-lead.md` — tasks.md template.

**Current state:** No explicit DoD check between implementer DONE and spec compliance review. Tasks can complete with failing tests, no commit, or missing per-spec requirements.

**New rule:** After implementer reports DONE/DONE_WITH_CONCERNS, before spec compliance reviewer dispatches, TPM runs DoD gate.

### Fixed baseline (every task)
- At least one commit exists for this task
- Tests pass (test runner exits 0, command from `~/.brocode/wiki/<repo-slug>/test-strategy.md`)
- No TODO/FIXME in changed files (`git diff` scan)

### Per-task DoD (optional, authored by Tech Lead)
Tech Lead adds `**DoD:**` field to task blocks in `tasks.md` for requirements beyond the baseline:
```markdown
**DoD:**
- [ ] Feature flag wired and tested off
- [ ] API contract matches engineering-spec.md section 4
```

### Gate behavior
- Baseline fails → implementer re-dispatched with specific failure message. Max 2 retries → escalate to user.
- Per-task DoD item fails → same re-dispatch path.
- All pass → proceed to QA gate.

TPM prints on pass:
```
✅ TPM → DoD gate passed: TASK-BE-01 (3/3 baseline + 2/2 per-task)
```
On failure:
```
❌ TPM → DoD gate failed: TASK-BE-01 — no commit found. Re-dispatching implementer.
```

**Files changed:**
- `commands/brocode.md` — add DoD gate step between implementer DONE and spec review dispatch
- `agents/tech-lead.md` — add `**DoD:**` field to tasks.md template with authoring guidance

---

## Mechanism 3: QA Gate Per Task

**Location:** `commands/brocode.md` — develop task loop.

**Current state:** QA sub-agent runs once during spec phase to produce `test-cases.md`. During develop mode, no QA verification happens per task. Implementer self-reviews but coverage gaps go undetected until PR review.

**New rule:** After DoD gate passes, TPM dispatches QA sub-agent (`agents/qa.md`) before spec compliance review.

### Flow
```
implement → DoD gate → [QA GATE] → spec review → quality review → next task
```

### QA gate dispatch
TPM writes instruction file for QA with:
- Worktree path
- Task being verified (full task block from `tasks.md`)
- Relevant test cases from `.brocode/<id>/test-cases.md` for this task
- Test command from `~/.brocode/wiki/<repo-slug>/test-strategy.md`

QA sub-agent:
1. Runs the test suite
2. Cross-checks coverage against `test-cases.md` for this task
3. Identifies missing test cases
4. Reports PASS or FAIL with specific findings

### Gate behavior
- PASS → all test cases covered, suite green → proceed to spec review
- FAIL → implementer re-dispatched with QA findings (missing tests listed, failures quoted). Max 2 retries → escalate to user.

TPM prints:
```
🔍 TPM → QA dispatched: TASK-BE-01
✅ TPM → QA passed: 8/8 test cases covered, suite green
```
or:
```
❌ TPM → QA failed: 2 missing test cases, 1 failure — routing back to implementer
```

**Ownership:** Implementer owns writing tests (TDD). QA owns verifying coverage and correctness. Clean separation.

**Files changed:**
- `commands/brocode.md` — add QA gate dispatch step between DoD gate and spec review

---

## Mechanism 4: Migration Safety

**Location:** `agents/tech-lead.md` — tasks.md authoring rules.

**Current state:** Tech Lead writes migration tasks but no enforced checklist. Migration DoD items depend on the author remembering to add them.

**New rule:** Tech Lead authoring rule — if a task involves a schema migration (ALTER TABLE, CREATE TABLE, DROP, migration, schema change), the task's `**DoD:**` block MUST include:

```markdown
**DoD:**
- [ ] Down migration written and tested
- [ ] Migration tested on staging data volume
- [ ] Migration safe under concurrent writes (no full-table lock)
- [ ] Rollback procedure tested in staging (see sre.md)
```

This is a tasks.md quality bar enforced by Tech Lead at spec time — same as file paths and function signatures. SRE writes rollback/staging requirements into `sre.md`. QA verifies migration DoD items at QA gate.

**No runtime detection** — Tech Lead identifies migration tasks from the spec. No TPM engineering logic.

**Files changed:**
- `agents/tech-lead.md` — add migration DoD rule to tasks.md authoring section

---

## Mechanism 5: PR Description Quality Gate

**Location:** `commands/brocode.md` — develop mode, before `finishing-a-development-branch`.

**Current state:** `finishing-a-development-branch` creates PR with commit-derived description. No spec grounding, no required sections, no label.

**New rule:** Before invoking `finishing-a-development-branch`, TPM generates a PR description from spec artifacts and enforces required fields.

### TPM reads
- `.brocode/<id>/engineering-spec.md` — problem statement (section 1), rollback (section 11)
- `.brocode/<id>/tasks.md` — completed tasks for this domain
- `.brocode/<id>/test-cases.md` — test cases for this domain
- Git commits in worktree (`git log --oneline`)

### Required description structure
```markdown
## Summary
[from engineering-spec.md section 1 — problem statement]

## Changes
[completed tasks for this domain, one bullet per task]

## Test plan
[from test-cases.md for this domain]

## Rollback
[from engineering-spec.md section 11]

## References
Spec: .brocode/<id>/engineering-spec.md
brocode run: <spec-id>
```

If any section is missing from source artifacts, TPM fills with `[NOT PROVIDED — update before merge]` and prints warning.

### Label
`tool::brocode` applied at PR creation:
- GitHub: `gh pr create --label "tool::brocode" ...` (detected via `git remote get-url origin` containing `github.com`)
- GitLab: `glab mr create --label "tool::brocode" ...` (detected via remote URL containing `gitlab`)

TPM prints:
```
📋 TPM → PR description generated from spec artifacts
🏷️  TPM → label applied: tool::brocode
✅ TPM → PR raised: <url>
```

**Files changed:**
- `commands/brocode.md` — add PR description generation step before `finishing-a-development-branch`; add `--label "tool::brocode"` to PR creation

---

## Revised Develop Mode Task Loop

Current:
```
implement → spec review → quality review → next task
```

New:
```
implement → DoD gate → QA gate → spec review → quality review → next task
```

Full develop flow with all mechanisms:
```
develop-start:
  1. Scan tasks.md for effort sizes → print summary (Mechanism 1)
  2. Check for XL tasks → warn (Mechanism 1)
  [per domain, parallel]
  3. worktree setup
  4. writing-plans
  [per task loop]
  5. dispatch implementer subagent
  6. DoD gate: baseline + per-task items (Mechanism 2)
  7. QA gate: run tests + coverage check (Mechanism 3)
  8. spec compliance review
  9. code quality review
  10. mark task complete
  [after all tasks]
  11. generate PR description from spec artifacts (Mechanism 5)
  12. finishing-a-development-branch with label tool::brocode
  13. worktree cleanup
```

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| No test-strategy.md for repo | QA falls back to repo tags in repos.json (npm test / pytest / go test ./...) |
| XL task not broken down | Warning only — user must decide, develop proceeds |
| Missing rollback in engineering-spec.md | PR description fills `[NOT PROVIDED — update before merge]` |
| GitLab vs GitHub | Label applied via glab vs gh — TPM detects from remote URL |
| Migration task with no DoD field | Tech Lead authoring rule violation — enforcement is at tasks.md review time, not runtime |
| Per-task DoD item not checkable by TPM | TPM asks implementer to confirm item in DONE report |

---

## Files Changed

| File | Change |
|------|--------|
| `agents/tech-lead.md` | Add `**Effort:**` field + size guide to tasks.md template |
| `agents/tech-lead.md` | Add `**DoD:**` field + authoring guidance to tasks.md template |
| `agents/tech-lead.md` | Add migration DoD rule to tasks.md authoring section |
| `commands/brocode.md` | Add effort summary print at develop-start |
| `commands/brocode.md` | Add DoD gate step between implementer DONE and spec review |
| `commands/brocode.md` | Add QA gate dispatch step between DoD gate and spec review |
| `commands/brocode.md` | Add PR description generation step before finishing-a-development-branch |
| `commands/brocode.md` | Add `--label "tool::brocode"` to PR creation |

No new agent files. No new commands. No new dependencies.

---

## What Is Not In Scope

- Changing the spec/investigate flow (develop mode only)
- Automatic XL task breakdown
- Cross-task dependency enforcement
- Changing which model agents use

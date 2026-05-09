# Assess Mode + Engineering-Spec Executable Section + Develop-Mode PR Babysitter

**Status:** Draft
**Date:** 2026-05-09
**Owner:** brocode

## Goal

Three coupled changes to brocode:

1. **`assess` mode** — rate readiness of product specs, engineering specs, and code; compare multiple specs side-by-side. Multi-dimensional 1–10 scoring with strengths and need-improvement areas. Threshold gate blocks downstream work when artifact is not ready.
2. **`engineering-spec.md` upgrade** — new Section 11 "Executable Code Changes" with per-task file paths, function signatures, pseudo-diffs, call sites, and test stubs. Engineer reads spec and has clear code shape to start.
3. **Develop-mode autonomy** — develop runs through superpowers skills as hard default. After PR opens, agent enters a 270-second polling loop (cache-aware, under Anthropic prompt-cache 5-min TTL — pattern from ruflo-autopilot ADR-0001) that addresses CI failures, review comments, conflicts, and merges when approved. Per-task tracker files in `~/.brocode/code/`. Hard cap of 2 active worktrees with queueing for the rest. New `/brocode status` shows live state of all tasks.

## Why

- Specs ship to engineering with hidden gaps. No quantitative readiness signal. Tech leads guess.
- Engineering specs describe intent, not shape of changes. Engineers re-derive structure from scratch every task.
- Develop mode opens a PR and stops. Human babysits CI, comments, and merge — exactly the work an agent should automate.

---

## Change 1 — Assess Mode

### Invocation

```
/brocode:brocode assess <path>                        — single artifact (auto-detected)
/brocode:brocode assess <spec1> <spec2> [<specN>]     — comparison
/brocode:brocode assess code <path|repo|pr-url>       — code rating
```

### Routing

`skills/brocode/SKILL.md` Step 0 table gains:

| Input matches | Load |
|--------------|------|
| assess / rate / score / "how good is" / "compare specs" | `skills/brocode/modes/assess.md` |

### Auto-detection

| Detection | Type |
|---|---|
| 1 path, file, sections 1–15 markers | product-spec |
| 1 path, file, Eng Spec section markers | engineering-spec |
| 2+ paths to `.md` files | comparison |
| 1 path, dir or git repo | code (local) |
| URL matches `github.com/.../pull/N` or `gitlab.com/.../merge_requests/N` | code on PR |

### Scoring rubric (1–10 per dim)

**Spec dimensions:**
- Clarity — intent unambiguous, terms defined
- Completeness — required sections filled, no TBDs
- Feasibility — implementable with current stack
- Testability — acceptance criteria measurable
- Risk-coverage — failure modes, rollback, blast radius

**Code dimensions:**
- Pattern-adherence — matches team patterns from code + CLAUDE.md
- Readability — naming, structure, comments where needed
- Test-coverage — present, meaningful
- Maintainability — module boundaries, coupling
- Security — input validation, auth, secret handling

**Code/PR mode also emits:**

- `change_type` ∈ {feature, bugfix, refactor, perf, security, docs} — single label classifying the diff intent (inspired by ruflo-jujutsu).
- `risk_band` ∈ {low, medium, high, critical} — derived from blast radius, test coverage delta, security dim score, and lines changed.

These are reported in assessment.md under a `## Change Profile` section, only for code/PR inputs.

**Overall = weighted average.** Default equal weights. Configurable in `~/.brocode/repos.json` per project under `dimension_weights`.

### Pattern source for code mode

Primary truth = code analysis (live grep + AST-light reading). High-weight secondary = `CLAUDE.md` (authoritative team rules). Cache layer = `~/.brocode/wiki/<repo>/` (existing knowledge base). Cache used for orientation, not as scoring source.

### Owner and dispatch

Tech Lead orchestrates.

- **Spec input** — Tech Lead reads spec, scores. Dispatches domain SWE only when spec references domain-specific tech needing feasibility verification.
- **Code input** — Tech Lead dispatches Backend / Frontend / Mobile per files in scope, SRE for infra, QA for test files. Parallel. Each returns domain-scoped dim scores plus findings. Tech Lead synthesizes.
- **Comparison input** — Run rubric per spec, then Tech Lead writes side-by-side table and picks winner with delta rationale.

### Output

`.brocode/<id>/assessment.md`:

```markdown
# Assessment <id>
**Input:** <path|url>
**Type:** <product-spec | engineering-spec | code | comparison>
**Overall:** 7.4/10 — READY-WITH-FIXES
**Threshold:** 7 (configured) → PASS

## Scores
| Dimension | Score | Verdict |
|-----------|-------|---------|
| Clarity | 8 | strong |
| Completeness | 7 | adequate |
| ...

## Strengths
- bullet list, 3–7 items

## Need Improvement
- bullet list, each item: what is weak, why, how to fix

## Pattern Deviations  (code mode only)
- file:line — observed X, team pattern Y, fix: Z

## Comparison  (multi-spec mode only)
| Spec | Overall | Winner-on |
|------|---------|-----------|
| A    | 7.4     | clarity, testability |
| B    | 6.8     | feasibility |

## Recommended Next Step
- "spec needs revision: tighten section 6 (testability)"  OR
- "ready — run /brocode:brocode develop"
```

Terminal headline: `🧪 Tech Lead → assessment 7.4/10 (READY-WITH-FIXES) — .brocode/<id>/assessment.md`

### Threshold gate

`~/.brocode/repos.json` per repo gains:

```json
{
  "backend": [
    {
      "path": "/path/to/api",
      "min_score": 7,
      "dimension_weights": { "clarity": 1.5, "feasibility": 1.0 }
    }
  ]
}
```

`develop.md` reads latest `assessment.md` for the brocode id. If `overall < min_score` → block start of develop mode, print failing dimensions, recommend revision.

---

## Change 2 — Engineering-Spec Section 11: Executable Code Changes

### File touched

`agents/_includes/tech-lead/templates.md` — lazy-loaded include read at artifact-write time.

### Section position

Insert as Section 11 between current "Implementation Approach" and "Test Plan". Renumber subsequent sections. Total section count grows from 14 → 15 in `CLAUDE.md` and Tech Lead E2E mandate.

### Per-task content (template)

```markdown
### Task <N>: <title>
**Domain:** backend | web | mobile | infra | qa
**Files touched:**
- `path/to/file.ext` — new | modify | delete

**Function signatures:**
```<lang>
function authenticateUser(req: Request): Promise<Session>
```

**Pseudo-diff:**
```diff
- if (token.expiry < now)
+ if (token.expiry <= now)
```

**Call sites to update:**
- `path/a.ext:42` — pass new arg
- `path/b.ext:88` — handle new return shape

**Test stub:**
```<lang>
test('rejects expired token at exact expiry', () => { ... })
```

**Acceptance:** <one-line measurable outcome>
```

### Rules for Tech Lead

- Pseudo-diff is sketch, not full file. Show changed lines plus 2 lines context.
- Skip per-task only if marked `N/A — design-only` with reason.
- Test stub references behavior, not implementation. Failing test first (TDD-aligned).
- Call-site list comes from grep during synthesis. Stale spec is a bug.

### Mandate updates

- `agents/tech-lead.md` E2E Spec Mandate: "Section 11 Executable Code Changes covered per task. N/A allowed only with explicit reason."
- `agents/engineering-bar-raiser.md` What You Look For: "Section 11 present per task. Pseudo-diffs concrete. Test stubs reference behavior. No 'TBD'."

---

## Change 3 — Develop-Mode Autonomy + Babysitter

### Files touched

**New:**
- `skills/brocode/modes/_shared/babysitter.md` — loop logic, state machine, severity classifier
- `templates/task-tracker.md` — tracker skeleton
- `templates/assessment.md` — assess output skeleton (Change 1)

**Modified:**
- `skills/brocode/modes/develop.md` — auto-superpowers hard default, babysitter wiring, worktree cap, queue
- `skills/brocode/modes/subcommands.md` — add `status` subcommand
- `CLAUDE.md` — document assess, babysitter, status, `~/.brocode/code/`, repos.json fields

### Auto-superpowers as hard default

`develop.md` wording change. Replace soft "reads superpowers skills" with **MUST invoke in this order, no skip**:

1. `superpowers:using-git-worktrees` — isolated worktree per domain
2. `superpowers:writing-plans` — convert tasks.md per domain into a plan
3. `superpowers:test-driven-development` — failing test first per task
4. `superpowers:subagent-driven-development` — implement task by task
5. `superpowers:systematic-debugging` — invoked when stuck >15 minutes on a task
6. `superpowers:finishing-a-development-branch` — open PR

If `superpowers` plugin not installed → block with install instructions (already implemented; keep).

### Task tracker file

**Path:** `~/.brocode/code/task-<slug>.md`

**Slug derivation:** `<domain>-<short-feature-id>` from `tasks.md` task title. Slugify: lowercase, alphanumerics + dashes, max 50 chars.

**Skeleton:**

```markdown
---
slug: backend-auth-expiry-fix
brocode_id: 2026-05-09-1430
domain: backend
worktree: /Users/x/.brocode/worktrees/backend-auth-expiry-fix
branch: feat/auth-expiry-fix
pr_url: https://github.com/org/repo/pull/123
# status enum: queued | coding | pr-open | ci-fixing | review-addressing | rebasing | merging | merged | escalated
status: pr-open
created_at: 2026-05-09T14:30:00Z
last_action_at: 2026-05-09T15:12:00Z
ci_retries: 0
review_retries: 0
escalation_reason: null
---

## Log
- [2026-05-09T14:30:00Z] task created from .brocode/2026-05-09-1430/tasks.md#task-3
- [2026-05-09T14:35:00Z] worktree created
- [2026-05-09T15:01:00Z] PR opened https://github.com/org/repo/pull/123

## Comments
- id=2034 author=alice severity=must resolved=false body_excerpt="auth check should use ..."
- id=2041 author=bob severity=nit resolved=false body_excerpt="rename var ..."
```

### Worktree cap and queueing

**Hard cap: 2 active.** Active = tracker file with `status` not in `{merged, escalated}`.

**Pre-dispatch counting:** before creating worktree, count `~/.brocode/code/task-*.md` with active status. If ≥2 → write tracker with `status: queued`, no worktree, return. Babysitter polls queue.

**Slot-freed event:** task transitions to `merged` → cleanup → next babysitter wakeup checks queue → promote oldest queued task → start coding (this includes invoking superpowers chain from step 1).

**Override:** `~/.brocode/repos.json` may set `worktree_cap: <n>` per repo; default 2.

### Babysitter loop

**Trigger:** PR opens. develop mode calls `ScheduleWakeup(delaySeconds=270, prompt="<<brocode-babysit:<slug>>>", reason="poll PR <slug>")`.

**Why 270s:** Anthropic prompt cache TTL is 5 minutes. 270s keeps the cache warm wakeup-to-wakeup; 300s+ pays a cache miss every tick. Pattern documented in ruflo-autopilot ADR-0001 ("cache-aware ScheduleWakeup heartbeat contract").

The prompt sentinel `<<brocode-babysit:<slug>>>` is a brocode-specific marker. Implementation note: handler in `_shared/babysitter.md` parses the slug from the sentinel on wake. If ScheduleWakeup runtime cannot pass custom sentinels, fallback is `/loop 10m /brocode:brocode babysit <slug>` (user-driven). Decided in plan phase.

**Each wakeup:**

1. Read tracker file `~/.brocode/code/task-<slug>.md`.
2. `gh pr view <pr_url> --json state,mergeable,mergeStateStatus,reviewDecision,reviewRequests,reviews,statusCheckRollup,comments`.
3. Branch on signals:

   | Signal | Action | New status |
   |--------|--------|------------|
   | `state=MERGED` | cleanup: `git worktree remove --force`, append history log, delete tracker file, promote queued | `merged` (file deleted) |
   | `state=CLOSED` and not merged | stop loop | `escalated`, reason="PR closed without merge" |
   | `statusCheckRollup` has FAILURE | dispatch SWE sub-agent → read failing logs → fix → commit → push. `ci_retries++`. If >3 same failure → escalate | `ci-fixing` |
   | `reviewDecision=CHANGES_REQUESTED` or unresolved review comments | dispatch SWE → address each comment → commit referencing comment id → push → resolve thread. `review_retries++`. If >3 → escalate | `review-addressing` |
   | `mergeable=CONFLICTING` | `git fetch origin main && git rebase origin/main`. Trivial conflict → auto-resolve, continue rebase, force-push **PR branch only**. Semantic conflict → escalate | `rebasing` |
   | `reviewDecision=APPROVED` and `mergeable=MERGEABLE` and all checks SUCCESS | `gh pr merge --squash --delete-branch` → on success, cleanup as merged | `merging` |
   | else (waiting) | log "waiting" | `pr-open` |

4. Update `## Comments` section in tracker (severity classify; see below).
5. Update `last_action_at`. Append log entry.
6. If status not terminal → `ScheduleWakeup(270s, "<<brocode-babysit:<slug>>>", reason)`. **Adaptive backoff:** if last wakeup outcome was "waiting" (no signal change) for 3 consecutive ticks, escalate interval to 900s (15min) until next signal change, then drop back to 270s. Reduces no-op wakeups when PR is idle (e.g., overnight while reviewers sleep).

### Comment severity classification

Native GitHub comments lack severity. Two-source resolution per comment:

1. **Body prefix** — `must:`, `good:`, `nit:`, `[must]`, `[good]`, `[nit]` (case-insensitive). Direct map.
2. **LLM classify fallback** — no prefix → Tech Lead sub-agent batch-classifies during status read. Heuristic: blocking bugs, security, correctness → must. Suggestions, refactor → good. Style, typo, naming → nit.

**Cache:** classification stored under `## Comments` in tracker file keyed by comment id. Re-classify only new comments on each wakeup.

### `/brocode status` subcommand

`subcommands.md` gains:

```markdown
### `status`
Reads all `~/.brocode/code/task-*.md` → prints table:

| Slug | Domain | Status | PR | Reviewers | Open | Must | Good | Nit | Last Action | Retries |
|------|--------|--------|----|-----------|------|------|------|-----|-------------|---------|
| backend-auth-expiry-fix | backend | review-addressing | #123 | alice, bob | 4 | 2 | 1 | 1 | 3m ago | ci:0 rev:1 |
| web-settings-page | web | ci-fixing | #124 | — | 0 | 0 | 0 | 0 | 1m ago | ci:2 rev:0 |
| mobile-onboarding | mobile | queued | — | — | — | — | — | — | — | — |

Active: 2/2  Queued: 1
```

**Columns:**
- Reviewers — comma list of GitHub logins from `gh pr view --json reviewRequests,reviews`. Drop dupes.
- Open — total unresolved comment count.
- Must / Good / Nit — counts from cached severity classifications.
- Last Action — relative time since `last_action_at`.
- Retries — `ci:<n> rev:<n>`.

### Wakeup history log

Every wakeup appends one JSONL line to `~/.brocode/code/history.jsonl`:

```json
{"ts":"2026-05-09T15:12:00Z","slug":"backend-auth-expiry-fix","status_before":"pr-open","status_after":"ci-fixing","action":"dispatch_swe_ci_fix","duration_ms":4231,"outcome":"ok","ci_retries":1,"review_retries":0}
```

Pattern adopted from ruflo `worker-history` namespace (dispatch events + durations + verdicts). Enables: debugging escalation patterns, retro analysis of stuck PRs, future learning signals. Append-only. Rotated by user — brocode does not auto-rotate.

### Resume on session restart

`ScheduleWakeup` lifetime is bound to session. On new session, TPM reads `~/.brocode/code/task-*.md`. For each non-terminal status → re-arm wakeup. Logic lives in `_shared/babysitter.md` so any mode entry can trigger resume.

### Escalation surface

Status=escalated → terminal print:

```
⚠️ task <slug> stuck — <reason>
   PR: <url>
   resume: /brocode:brocode develop --resume=<slug>
   abandon: /brocode:brocode develop --abandon=<slug>
```

Loop stops. Worktree preserved. Tracker file kept until `--abandon`.

### Safety guards

- Never force-push main. Only PR branch.
- Never `--no-verify`, `--no-gpg-sign`.
- Never auto-merge if `mergeStateStatus` indicates branch protections disabled.
- Never auto-merge if PR title or body contains `WIP` or `DRAFT`.
- **Trivial-conflict whitelist:** whitespace, import order (eslint/prettier auto-fix), lockfile regen (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock` — re-run install). Anything else = semantic = escalate.
- CI fix retry cap: 3 on same failing job. New failure resets counter.
- Comment retry cap: 3 per thread.
- All git operations isolated to PR branch worktree. Main worktree never modified.

---

## File change summary

**New:**
- `skills/brocode/modes/assess.md`
- `skills/brocode/modes/_shared/babysitter.md`
- `templates/task-tracker.md`
- `templates/assessment.md`

**Modified:**
- `skills/brocode/SKILL.md` — add `assess` route, add `status` route
- `skills/brocode/modes/develop.md` — auto-superpowers hard default, babysitter wiring, worktree cap, queue
- `skills/brocode/modes/subcommands.md` — add `status` subcommand
- `agents/_includes/tech-lead/templates.md` — add Section 11 Executable Code Changes
- `agents/tech-lead.md` — E2E mandate update, babysitter responsibility
- `agents/engineering-bar-raiser.md` — Section 11 check
- `CLAUDE.md` — document assess flow, babysitter loop, status command, repos.json `min_score` and `worktree_cap`

**No changes:**
- `agents/pm.md`, `agents/product-bar-raiser.md`, `agents/qa.md`, `agents/sre.md`, `agents/swe-*.md`

---

## Acceptance criteria

1. `/brocode:brocode assess <product-spec.md>` produces `assessment.md` with 5 dim scores, overall, strengths, need-improvement, recommended next step.
2. `/brocode:brocode assess specA.md specB.md` produces side-by-side comparison table with winner.
3. `/brocode:brocode assess code <repo>` dispatches domain SWEs in parallel; output includes pattern-deviation list with file:line.
4. Threshold below `min_score` blocks `/brocode develop` start.
5. New `engineering-spec.md` written by Tech Lead contains Section 11 per task with all sub-fields. Eng BR rejects if missing.
6. `/brocode:brocode develop` opens PR, then ScheduleWakeup loop runs every 270s (with idle backoff to 900s after 3 no-op ticks), addressing CI / comments / conflicts autonomously, merging when approved. Each wakeup appends a JSONL row to `~/.brocode/code/history.jsonl`.
7. 3rd dev task started while 2 worktrees active → tracker file created with `status: queued`, no worktree. Promoted when slot frees.
8. `/brocode:brocode status` prints table with Reviewers / Open / Must / Good / Nit columns populated correctly.
9. Escalation prints terminal warning with resume/abandon hints; tracker preserved.
10. Force-push restricted to PR branch. Trivial-conflict whitelist enforced. Auto-merge gated on `mergeable=MERGEABLE` and approval.
11. Code/PR assessment.md includes a `## Change Profile` section with `change_type` (one of feature|bugfix|refactor|perf|security|docs) and `risk_band` (low|medium|high|critical).

---

## Out of scope

- GitLab MR support for babysitter (GitHub only this iteration). GitLab review mode unchanged.
- Multi-machine coordination (tracker files local).
- Per-task plan-mode UI.
- Slack / email notifications on escalation.
- Automatic rollback after merge.

---

## Open questions for plan phase

- ScheduleWakeup custom-sentinel routing: confirm whether `<<brocode-babysit:<slug>>>` resolves through harness or needs `/loop` fallback.
- Severity LLM classifier: which model? (Tech Lead default haiku-4-5 sufficient for batch classify?)
- Trivial-conflict auto-resolve: lockfile regen requires running package manager — gate behind detected manager (`pnpm`, `npm`, `yarn`) and skip if absent.
- Status table relative time formatting library (built-in date math vs dependency).

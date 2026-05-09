# Assess Mode + Engineering-Spec Executable Section + PR Babysitter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/brocode assess` mode for rating specs and code, upgrade `engineering-spec.md` with an executable code-changes section, and make `/brocode develop` autonomously babysit PRs through to merge.

**Architecture:** Three new mode/include files load lazily from `skills/brocode/SKILL.md`. Develop mode wires `ScheduleWakeup` polling and per-task tracker files in `~/.brocode/code/`. Tech Lead orchestrates assess scoring with parallel SWE/QA/SRE dispatch. Existing dispatch-fanout, repos.json, and superpowers chain are reused — no new agents.

**Tech Stack:** Markdown skill files (no compiled code). `gh` CLI for GitHub PR operations. `ScheduleWakeup` tool for polling loop. `git worktree` for isolation. Bash for state file management. Markdown frontmatter parsed by simple `grep`/`awk` patterns.

**Reference spec:** `docs/superpowers/specs/2026-05-09-assess-mode-and-pr-babysitter-design.md`

---

## File Structure

**New files:**
- `skills/brocode/modes/assess.md` — assess mode entry, routing, scoring rubric, dispatch logic
- `skills/brocode/modes/_shared/babysitter.md` — wakeup loop, state machine, severity classifier, resume logic
- `templates/task-tracker.md` — `~/.brocode/code/task-<slug>.md` skeleton
- `templates/assessment.md` — `.brocode/<id>/assessment.md` skeleton

**Modified files:**
- `skills/brocode/SKILL.md` — add `assess` and `status` route rows
- `skills/brocode/modes/develop.md` — wire babysitter, worktree cap, queue, threshold gate, hard-default superpowers chain
- `skills/brocode/modes/subcommands.md` — add `status` subcommand; sync develop changes
- `agents/_includes/tech-lead/templates.md` — add Section 11 Executable Code Changes to engineering-spec
- `agents/tech-lead.md` — E2E mandate update + babysitter responsibility
- `agents/engineering-bar-raiser.md` — Section 11 check
- `CLAUDE.md` — document new mode, status command, repos.json `min_score` and `worktree_cap`

**State directory:** `~/.brocode/code/` (created by develop mode if absent).

---

## Task 1: Create assessment.md output template

**Files:**
- Create: `templates/assessment.md`

- [ ] **Step 1: Write the template**

```markdown
# Assessment <id>
**Input:** <path|url>
**Type:** <product-spec | engineering-spec | code | comparison>
**Overall:** N.N/10 — <READY | READY-WITH-FIXES | NOT-READY>
**Threshold:** N (configured) → <PASS | FAIL>

## Scores
| Dimension | Score | Verdict |
|-----------|-------|---------|
| <dim>     | N     | strong | adequate | weak |

## Strengths
- <bullet, 3–7 items>

## Need Improvement
- <bullet, each item: what is weak, why, how to fix>

## Change Profile
<!-- code/PR mode only; otherwise omit section -->
- **change_type:** <feature | bugfix | refactor | perf | security | docs>
- **risk_band:** <low | medium | high | critical>
- **rationale:** <one line: what drove the risk band>

## Pattern Deviations
<!-- code mode only; otherwise omit section -->
- file:line — observed X, team pattern Y, fix: Z

## Comparison
<!-- multi-spec mode only; otherwise omit section -->
| Spec | Overall | Winner-on |
|------|---------|-----------|
| A    | N.N     | <dims>    |

## Recommended Next Step
- <one line: revise spec | run /brocode develop | escalate to user>
```

- [ ] **Step 2: Commit**

```bash
git add templates/assessment.md
git commit -m "Add assessment.md output template for assess mode"
```

---

## Task 2: Create task-tracker.md state file template

**Files:**
- Create: `templates/task-tracker.md`

- [ ] **Step 1: Write the template**

```markdown
---
slug: <domain>-<short-feature-id>
brocode_id: <yyyy-mm-dd-hhmm>
domain: backend | web | mobile | infra | qa
worktree: <absolute-path>
branch: brocode/<spec-id>-<domain>
pr_url: <https://github.com/.../pull/N>
# status enum: queued | coding | pr-open | ci-fixing | review-addressing | rebasing | merging | merged | escalated
status: queued
created_at: <ISO-8601>
last_action_at: <ISO-8601>
ci_retries: 0
review_retries: 0
escalation_reason: null
---

## Log
- [<ISO-8601>] task created from .brocode/<brocode_id>/tasks.md#<task-id>

## Comments
<!-- one row per PR comment; populated by babysitter wakeups -->
- id=<n> author=<login> severity=<must|good|nit> resolved=<true|false> body_excerpt="<first 80 chars>"
```

- [ ] **Step 2: Commit**

```bash
git add templates/task-tracker.md
git commit -m "Add task-tracker.md state file template for develop mode"
```

---

## Task 3: Create assess mode file

**Files:**
- Create: `skills/brocode/modes/assess.md`

- [ ] **Step 1: Write the assess mode file**

```markdown
# brocode: assess mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: assess / rate / score / "compare specs" -->

### `assess` / `rate` / `score`

Inputs:
- 1 path → single artifact (auto-detect type)
- 2+ paths to `.md` → comparison
- `code <path|repo|pr-url>` → code rating
- bare path that resolves to a directory or git repo → code rating

If input is empty, ask: "What to assess? Path to spec, multiple specs, or `code <path>`."

### Auto-detect

| Detection | Type |
|---|---|
| 1 `.md` file with sections labeled `## 1.` through `## 15.` | product-spec |
| 1 `.md` file with `# Engineering Spec` header | engineering-spec |
| 2+ `.md` paths | comparison |
| 1 path to dir or git repo | code (local) |
| URL matching `github.com/.../pull/N` | code on PR |

### Pre-flight

- Read `~/.brocode/repos.json` for `min_score` and `dimension_weights` of relevant repo (if applicable). Defaults: min_score=7, equal weights.
- Mint a brocode `<id>` if none active: `assess-<yyyymmdd-hhmm>`. Create `.brocode/<id>/`.

### Dispatch (Tech Lead)

Print: `🧪 Tech Lead → starting assessment of <input>`

Write `.brocode/<id>/instructions/tech-lead-assess.md` with:
- Input path(s) and detected type
- Rubric to apply (spec dims OR code dims)
- Threshold and weights from repos.json
- Output path: `.brocode/<id>/assessment.md`

Dispatch Tech Lead sub-agent (`agents/tech-lead.md`):

**Spec input:** Tech Lead reads spec, scores each dim 1–10. Dispatch domain SWE only if spec references domain-specific tech needing feasibility verification. Synthesize → write assessment.md.

**Code input:** Tech Lead identifies files in scope. Dispatch in parallel:
- Backend SWE for backend files
- Frontend SWE for web files
- Mobile SWE for mobile files
- SRE for infra files
- QA for test files

Each sub-agent returns domain-scoped dim scores + findings + pattern deviations (file:line — observed X, team pattern Y, fix: Z).

Tech Lead synthesizes into single assessment.md.

**Comparison input:** Run rubric per spec, build side-by-side comparison table, pick winner with delta rationale, write assessment.md with `## Comparison` section.

### Scoring rubric

**Spec dimensions (1–10 each):**
- Clarity — intent unambiguous, terms defined
- Completeness — required sections filled, no TBDs
- Feasibility — implementable with current stack
- Testability — acceptance criteria measurable
- Risk-coverage — failure modes, rollback, blast radius

**Code dimensions (1–10 each):**
- Pattern-adherence — matches team patterns from code + CLAUDE.md
- Readability — naming, structure, comments where needed
- Test-coverage — present, meaningful
- Maintainability — module boundaries, coupling
- Security — input validation, auth, secret handling

**Code/PR mode also emits (single label each, not 1–10):**
- `change_type` ∈ {feature, bugfix, refactor, perf, security, docs} — diff intent classification
- `risk_band` ∈ {low, medium, high, critical} — derived from blast radius (files touched), test-coverage delta, security score, lines changed:
  - critical: security score < 5 OR > 1000 lines changed OR auth/payment paths touched
  - high: security score < 7 OR > 300 lines OR test-coverage score < 5
  - medium: > 100 lines OR pattern-adherence < 6
  - low: everything else

These are written to a `## Change Profile` section in assessment.md, only for code/PR inputs.

**Overall = weighted average.** Default equal weights. `dimension_weights` from repos.json override.

**Pattern source for code mode:** primary truth = live code analysis (grep + read targeted files). High-weight secondary = `CLAUDE.md` of the repo. Cache for orientation = `~/.brocode/wiki/<repo-slug>/` (existing knowledge base). Cache is not the scoring source.

### Output

Write `.brocode/<id>/assessment.md` using `templates/assessment.md` skeleton.

Verdict labels by overall score:
- ≥ 8.0 → READY
- ≥ threshold and < 8.0 → READY-WITH-FIXES
- < threshold → NOT-READY

### Terminal headline

`🧪 Tech Lead → assessment N.N/10 (<verdict>) — .brocode/<id>/assessment.md`

If type=comparison, additionally print:
`🏆 Tech Lead → winner: <spec-name> (overall N.N vs N.N)`

Stop.
```

- [ ] **Step 2: Commit**

```bash
git add skills/brocode/modes/assess.md
git commit -m "Add assess mode for rating specs and code with multi-dim scoring"
```

---

## Task 4: Create babysitter shared library

**Files:**
- Create: `skills/brocode/modes/_shared/babysitter.md`

- [ ] **Step 1: Write the babysitter shared file**

```markdown
# brocode: babysitter shared library
<!-- Loaded on demand by develop.md after PR opens, or on session resume by TPM -->

## Purpose

Polls open PRs at 270-second intervals (cache-aware; under Anthropic prompt-cache 5-min TTL — pattern from ruflo-autopilot ADR-0001). Auto-addresses CI failures, review comments, conflicts. Auto-merges when approved + green. Maintains per-task tracker file at `~/.brocode/code/task-<slug>.md` and append-only audit log at `~/.brocode/code/history.jsonl`.

## Trigger

After `gh pr create` succeeds, develop mode calls:

```
ScheduleWakeup(
  delaySeconds=270,
  prompt="<<brocode-babysit:<slug>>>",
  reason="poll PR <slug>"
)
```

The sentinel `<<brocode-babysit:<slug>>>` is recognized at wake by SKILL.md routing. SKILL.md adds row:

| Input matches | Load |
|---|---|
| starts with `<<brocode-babysit:` | `skills/brocode/modes/_shared/babysitter.md` (run wakeup handler) |

## Wakeup handler

On entry:
1. Parse slug from sentinel: strip `<<brocode-babysit:` prefix and `>>` suffix.
2. Read `~/.brocode/code/task-<slug>.md`. If file does not exist → stop (task abandoned).
3. Run: `gh pr view <pr_url> --json state,mergeable,mergeStateStatus,reviewDecision,reviewRequests,reviews,statusCheckRollup,comments,title,body`
4. Branch on signals — first match wins:

| Signal | Action | New status |
|--------|--------|------------|
| `state=MERGED` | cleanup (see below) | `merged` (file deleted) |
| `state=CLOSED` and not merged | stop loop | `escalated`, reason="PR closed without merge" |
| title or body contains `WIP` or `DRAFT` | log "draft, skipping merge" | `pr-open` |
| `statusCheckRollup` has any FAILURE | dispatch SWE to fix CI; ci_retries++ | `ci-fixing` |
| `reviewDecision=CHANGES_REQUESTED` or unresolved review comments | dispatch SWE to address; review_retries++ | `review-addressing` |
| `mergeable=CONFLICTING` | rebase (see below) | `rebasing` |
| `reviewDecision=APPROVED` and `mergeable=MERGEABLE` and all checks SUCCESS and `mergeStateStatus=CLEAN` | `gh pr merge --squash --delete-branch` | `merging` |
| else | log "waiting" | `pr-open` |

5. Update `## Comments` section in tracker (severity classify; see below).
6. Update `last_action_at` to current ISO-8601 time. Append log entry to tracker `## Log` section AND append one JSONL row to `~/.brocode/code/history.jsonl` (see History log section below).
7. If status not in `{merged, escalated}` → re-arm:
   - Default: `ScheduleWakeup(270, "<<brocode-babysit:<slug>>>", reason="<status>")`
   - **Idle backoff:** if last 3 wakeups all transitioned to `pr-open` with no signal change, use `ScheduleWakeup(900, ...)` instead. Reset to 270s on next signal change. Track via `idle_ticks` counter in tracker frontmatter.

## CI fix sub-task

When status=ci-fixing:
- Read failing job logs: `gh run view <run-id> --log-failed`
- Dispatch domain SWE sub-agent with:
  - Worktree path from tracker
  - Failing test names + log excerpts
  - Last 5 commits on PR branch
- SWE fixes, runs local tests, commits, pushes.
- After push, schedule next wakeup (CI re-runs).
- If `ci_retries > 3` for the same failing job → status=escalated, reason="CI failure persists after 3 attempts: <job>".

## Comment-addressing sub-task

When status=review-addressing:
- For each unresolved review comment with severity=must (or unclassified):
  - Dispatch domain SWE sub-agent with:
    - Comment body, file, line
    - Worktree path
  - SWE edits code, commits with message `address review comment #<id>: <short>`, pushes.
  - Resolve thread: `gh api -X PATCH /repos/{owner}/{repo}/pulls/comments/<id> -f resolved=true` (or use `gh pr review --resolve` if available)
- Skip nit-only and good-only threads unless user has interjected.
- If `review_retries > 3` for the same thread → status=escalated, reason="Review comment <id> persists after 3 attempts".

## Rebase sub-task

When status=rebasing:
- `cd <worktree>`
- `git fetch origin main`
- `git rebase origin/main`
- If rebase fails:
  - Inspect conflicting files. **Trivial-conflict whitelist:**
    - whitespace-only diff (run `git diff --check`)
    - import order (run repo's prettier/eslint auto-fix; if no auto-fix → escalate)
    - lockfile regen: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock` → `git checkout --theirs <lockfile>` then re-run package manager (`pnpm install` / `npm install` / `yarn install`)
  - Anything else → status=escalated, reason="Semantic merge conflict in <file>".
- If rebase succeeded or trivial conflicts auto-resolved: `git push --force-with-lease origin <branch>` (PR branch only).
- **Never** push to main. **Never** force-push without `--force-with-lease`.

## Severity classification

For each comment from `gh pr view --json comments`:

1. **Body prefix match** (case-insensitive regex): `^(must|good|nit)[:\]]` or `^\[(must|good|nit)\]` → direct severity.
2. **No prefix** → batch-classify with Tech Lead model. Heuristic prompt:
   - Blocking bugs / security / correctness → `must`
   - Suggestions / refactor / better-but-not-blocking → `good`
   - Style / typo / naming → `nit`
3. **Cache** classification under `## Comments` in tracker keyed by comment id. Only re-classify new comments.

## History log (every wakeup)

Each wakeup appends one JSONL row to `~/.brocode/code/history.jsonl`:

```json
{"ts":"<ISO-8601>","slug":"<slug>","status_before":"<prev-status>","status_after":"<new-status>","action":"<action-taken>","duration_ms":<int>,"outcome":"ok|fail|escalated","ci_retries":<int>,"review_retries":<int>}
```

Append-only. Never rotated by brocode — user manages. Pattern: ruflo `worker-history` namespace (dispatch events + durations + verdicts).

Use cases: post-hoc debugging of stuck PRs, retro analysis of escalation patterns, future learning signals.

## Cleanup (status=merged)

```bash
git -C <worktree> worktree prune
git worktree remove --force <worktree-path>
# final history.jsonl entry recorded by step 6 of wakeup handler before cleanup
rm ~/.brocode/code/task-<slug>.md
```

After cleanup, scan for queued tasks:
```bash
ls ~/.brocode/code/task-*.md 2>/dev/null
```
For each tracker with `status: queued`, sorted oldest `created_at` first:
- If active count (status not in `{merged, escalated, queued}`) < worktree_cap (default 2):
  - Promote: invoke develop.md per-task chain (worktree → plan → TDD → SDD → finishing) for this slug.
  - Update tracker status=coding.

## Resume on session restart

TPM at session start (already runs Pre-flight per `agents/tpm.md`):
- After existing pre-flight, run: `ls ~/.brocode/code/task-*.md 2>/dev/null`
- For each tracker with status not in `{merged, escalated}`:
  - `ScheduleWakeup(60, "<<brocode-babysit:<slug>>>", reason="resume")`
- Print: `🔁 TPM → resumed N babysitter loop(s)` if any.

## Escalation

When status=escalated, print:

```
⚠️ task <slug> stuck — <reason>
   PR: <pr_url>
   resume: /brocode:brocode develop --resume=<slug>
   abandon: /brocode:brocode develop --abandon=<slug>
```

Loop stops (no further `ScheduleWakeup` calls). Worktree preserved. Tracker file preserved until `--abandon`.

## Safety guards (enforced before any push or merge)

- Refuse `git push origin main` or `git push origin master` — the babysitter never targets the default branch directly.
- Refuse `--no-verify`, `--no-gpg-sign` flags on commit.
- Refuse `gh pr merge` if `mergeStateStatus` is `BLOCKED` (branch protections failing).
- Refuse `gh pr merge` if PR title or body matches `\b(WIP|DRAFT)\b` (case-insensitive).
- All `git push --force-with-lease`, never bare `--force`.
- All operations cd-scoped to the PR branch worktree.
```

- [ ] **Step 2: Commit**

```bash
git add skills/brocode/modes/_shared/babysitter.md
git commit -m "Add babysitter shared library for autonomous PR polling and merge"
```

---

## Task 5: Add assess and status routes to SKILL.md

**Files:**
- Modify: `skills/brocode/SKILL.md`

- [ ] **Step 1: Read SKILL.md to confirm current state**

Run: `cat skills/brocode/SKILL.md`

Expected: file shows the Step 0 routing table from the design context (5 rows: bug, feature, develop, review, repos).

- [ ] **Step 2: Add new rows to the routing table**

Replace the existing routing table block (between `Detect mode from input, then read ONLY the relevant mode file:` and `Do NOT read other mode files.`) with:

```markdown
| Input matches | Load |
|--------------|------|
| bug / crash / error / broken / flaky / incident / "why is X" / "stopped working" | `skills/brocode/modes/investigate.md` |
| feature / spec / build / design / add / new / PRD / "build X" / "add Y" | `skills/brocode/modes/spec.md` |
| develop / implement / "build it" / "code it" / "start development" | `skills/brocode/modes/develop.md` |
| review / PR URL / MR URL / "review this" / "code review" | `skills/brocode/modes/review.md` |
| assess / rate / score / "how good is" / "compare specs" | `skills/brocode/modes/assess.md` |
| status / "task status" / "pr status" | `skills/brocode/modes/subcommands.md` (status section) |
| starts with `<<brocode-babysit:` | `skills/brocode/modes/_shared/babysitter.md` (run wakeup handler) |
| repos / setup / revise / challenge / export-adrs / "add constraint" | `skills/brocode/modes/subcommands.md` |
```

- [ ] **Step 3: Verify the file still parses cleanly**

Run: `head -40 skills/brocode/SKILL.md`

Expected: routing table has 8 rows. No duplicates. Step 0 instructions intact.

- [ ] **Step 4: Commit**

```bash
git add skills/brocode/SKILL.md
git commit -m "Route assess, status, and babysit-wakeup to new mode files"
```

---

## Task 6: Add status subcommand to subcommands.md

**Files:**
- Modify: `skills/brocode/modes/subcommands.md`

- [ ] **Step 1: Read subcommands.md to find insertion point**

Run: `grep -n "^### " skills/brocode/modes/subcommands.md`

Expected: list of subcommand headers. Insert `status` between `develop` and `review`.

- [ ] **Step 2: Insert the status subcommand block**

Add after the `develop` / `implement` block ends (before `### \`review\` / \`code-review\``):

````markdown
### `status`
If input is `status` or contains "task status" / "pr status" / "what's the status" / "list my tasks":

1. List trackers: `ls ~/.brocode/code/task-*.md 2>/dev/null`. If none → print `No active tasks.` and stop.
2. For each tracker file, read frontmatter + `## Comments` section.
3. For each tracker with `status: pr-open|ci-fixing|review-addressing|rebasing|merging`, refresh from GitHub:
   `gh pr view <pr_url> --json reviewRequests,reviews,comments` — extract reviewers (dedup logins from `reviewRequests.users[].login` + `reviews[].author.login`) and recount comments by cached severity.
   Update tracker `## Comments` cache for any new comment ids (classify via prefix match; if no prefix → batch LLM-classify per `_shared/babysitter.md` rules).
4. Print table:

   ```
   | Slug | Domain | Status | PR | Reviewers | Open | Must | Good | Nit | Last Action | Retries |
   |------|--------|--------|----|-----------|------|------|------|-----|-------------|---------|
   | <slug> | <domain> | <status> | #<pr-num> | <login,login> | <n> | <n> | <n> | <n> | <relative time> | ci:<n> rev:<n> |
   ```

   Columns:
   - Slug, Domain, Status — from tracker frontmatter
   - PR — `#<n>` from `pr_url` (or `—` if queued)
   - Reviewers — comma-list of GitHub logins (or `—` if none / queued)
   - Open — count of comments with `resolved=false`
   - Must / Good / Nit — counts of `severity=must|good|nit` and `resolved=false`
   - Last Action — `now - last_action_at` rounded (e.g., `3m ago`, `2h ago`)
   - Retries — `ci:<ci_retries> rev:<review_retries>`

5. Footer: `Active: <n>/<cap>  Queued: <n>` where Active = trackers with status not in `{merged, escalated, queued}`, Queued = `status: queued`. cap = `worktree_cap` from repos.json (default 2).

Stop.
````

- [ ] **Step 3: Verify insertion**

Run: `grep -A 2 "^### \`status\`" skills/brocode/modes/subcommands.md`

Expected: status block present once, immediately before review block.

- [ ] **Step 4: Commit**

```bash
git add skills/brocode/modes/subcommands.md
git commit -m "Add /brocode status subcommand to list active task trackers"
```

---

## Task 7: Add executable code changes section to engineering-spec template

**Files:**
- Modify: `agents/_includes/tech-lead/templates.md`

- [ ] **Step 1: Read templates.md to find engineering-spec section**

Run: `grep -n "^## " agents/_includes/tech-lead/templates.md`

Expected: list of headings. Locate the engineering-spec template's section list. Find current Section 11 ("Test Plan" or similar) — Section 11 is the insertion point; current Section 11 will become 12, etc.

- [ ] **Step 2: Insert Section 11 immediately before current Section 11**

Add new section block (use `Edit` with `old_string` matching the current `## 11.` heading and `new_string` containing the new Section 11 followed by a renumbered current 11):

```markdown
## 11. Executable Code Changes

For every task in `tasks.md`, populate the following block. Skip per-task only if the task is marked `N/A — design-only` with reason.

### Task <N>: <title>
**Domain:** backend | web | mobile | infra | qa
**Files touched:**
- `path/to/file.ext` — new | modify | delete

**Function signatures:**
\`\`\`<lang>
function authenticateUser(req: Request): Promise<Session>
\`\`\`

**Pseudo-diff:**
\`\`\`diff
- if (token.expiry < now)
+ if (token.expiry <= now)
\`\`\`

**Call sites to update:**
- `path/a.ext:42` — pass new arg
- `path/b.ext:88` — handle new return shape

**Test stub:**
\`\`\`<lang>
test('rejects expired token at exact expiry', () => { ... })
\`\`\`

**Acceptance:** <one-line measurable outcome>

### Rules

- Pseudo-diff is a sketch, not a full file. Show changed lines plus 2 lines of context.
- Test stub references behavior, not implementation. Failing test first (TDD-aligned).
- Call-site list is collected via grep during synthesis. A stale spec is a bug.
- If the task is `N/A — design-only`, replace the block with `_N/A — design-only: <reason>_`.
```

- [ ] **Step 3: Renumber subsequent sections**

For each `## N.` heading where N ∈ {11, 12, 13, 14} in the OLD numbering, increment by 1: 11→12, 12→13, 13→14, 14→15.

Use `sed`-style edits via `Edit` tool, one heading at a time.

- [ ] **Step 4: Update the section count reference**

Find `14 sections` references in templates.md (if any) and change to `15 sections`.

- [ ] **Step 5: Verify**

Run: `grep -E "^## 1[0-9]\." agents/_includes/tech-lead/templates.md`

Expected: headings ## 10. through ## 15., no duplicates.

- [ ] **Step 6: Commit**

```bash
git add agents/_includes/tech-lead/templates.md
git commit -m "Add Section 11 Executable Code Changes to engineering-spec template"
```

---

## Task 8: Update tech-lead.md E2E mandate

**Files:**
- Modify: `agents/tech-lead.md`

- [ ] **Step 1: Read agents/tech-lead.md to find E2E Spec Mandate section**

Run: `grep -n "E2E" agents/tech-lead.md`

Expected: locate the "E2E Spec Mandate" heading and its checklist.

- [ ] **Step 2: Add Section 11 line to the mandate checklist**

Insert as a new bullet in the mandate checklist (preserve existing bullets):

```markdown
- Section 11 Executable Code Changes covered per task. `N/A — design-only` allowed only with explicit reason.
```

- [ ] **Step 3: Update section count**

Replace any `14-section` or `14 sections` reference in agents/tech-lead.md with `15-section` / `15 sections`.

- [ ] **Step 4: Add babysitter responsibility note**

In the same file, locate the section describing Tech Lead duties during develop mode (or the closest equivalent). Append:

```markdown
### Babysitter responsibility

After PR is opened in develop mode, Tech Lead is the responsible owner for the babysitter loop dispatched per `skills/brocode/modes/_shared/babysitter.md`. Tech Lead delegates CI fixes and comment addressing to the appropriate domain SWE sub-agent each wakeup.
```

- [ ] **Step 5: Verify**

Run: `grep -c "Section 11" agents/tech-lead.md`

Expected: ≥ 1.

- [ ] **Step 6: Commit**

```bash
git add agents/tech-lead.md
git commit -m "Tech Lead: enforce Section 11 in spec, own babysitter loop"
```

---

## Task 9: Update engineering-bar-raiser.md check

**Files:**
- Modify: `agents/engineering-bar-raiser.md`

- [ ] **Step 1: Read engineering-bar-raiser.md "What You Look For" section**

Run: `grep -n "What You Look For" agents/engineering-bar-raiser.md`

Expected: heading present.

- [ ] **Step 2: Add Section 11 check**

Append to the "What You Look For" list:

```markdown
- **Section 11 Executable Code Changes** — present per task. Pseudo-diffs concrete (not "TBD"). Test stubs reference observable behavior. Call sites enumerated. Reject the spec if any task is missing the block without an `N/A — design-only` reason.
```

- [ ] **Step 3: Verify**

Run: `grep "Section 11" agents/engineering-bar-raiser.md`

Expected: ≥ 1 match.

- [ ] **Step 4: Commit**

```bash
git add agents/engineering-bar-raiser.md
git commit -m "Engineering BR: reject specs missing Section 11"
```

---

## Task 10: Add threshold gate, worktree cap, and queue logic to develop.md

**Files:**
- Modify: `skills/brocode/modes/develop.md`

- [ ] **Step 1: Read develop.md to confirm structure**

Run: `cat skills/brocode/modes/develop.md`

Expected: file currently shows develop step list (1–7) inside the "For each domain with tasks" loop.

- [ ] **Step 2: Insert assess threshold gate before domain loop**

After the line that prints the effort summary (the `Effort ranges:` block), and before `For each domain with tasks (backend / web / mobile):`, insert:

````markdown
- **Assess threshold gate** — if `.brocode/<id>/assessment.md` exists:
  - Read `Overall:` line. Parse score N.N.
  - Read `Threshold:` line. Parse threshold N.
  - If overall < threshold → print:
    ```
    ❌ TPM → assessment overall N.N below threshold N — develop blocked.
        Failing dimensions:
          - <dim>: <score> (<verdict>)
        Run /brocode:brocode revise or update the spec, then re-run /brocode:brocode assess.
    ```
    Stop.
  - Else print: `✅ TPM → assessment N.N ≥ threshold N — proceeding.`
- If `.brocode/<id>/assessment.md` is absent → print `⚠️ TPM → no assessment.md found — proceeding without gate (run /brocode:brocode assess to enforce thresholds).` and continue.
````

- [ ] **Step 3: Insert worktree cap and queue check at top of domain loop**

Replace the current header line `For each domain with tasks (backend / web / mobile):` and the subsequent `1. Invoke superpowers:using-git-worktrees ...` step with:

````markdown
For each domain with tasks (backend / web / mobile):

  **Worktree cap and queue check** (before any worktree creation):
  - Read `~/.brocode/repos.json` for `worktree_cap` of this repo (default 2).
  - Count active trackers: `ls ~/.brocode/code/task-*.md 2>/dev/null | xargs grep -l "^status: \(coding\|pr-open\|ci-fixing\|review-addressing\|rebasing\|merging\)" 2>/dev/null | wc -l`
  - If active count ≥ worktree_cap:
    - Derive slug: `<domain>-<short-feature-id>` from spec id and domain (e.g. `backend-oauth-fix`).
    - Write `~/.brocode/code/task-<slug>.md` from `templates/task-tracker.md` with `status: queued`. No worktree.
    - Print: `⏸ TPM → <domain> queued (worktree cap <cap>/<cap> reached). Will start when slot frees.`
    - Continue to next domain.
  - Else: derive slug, write tracker with `status: coding`, then proceed:

  1. Invoke `superpowers:using-git-worktrees` — create isolated worktree for branch `brocode/<spec-id>-<domain>`. Update tracker `worktree:` and `branch:` fields.
  2. Invoke `superpowers:writing-plans` — convert domain tasks from `tasks.md` into a superpowers plan at `docs/superpowers/plans/<spec-id>-<domain>.md` inside the worktree.
  3. Invoke `superpowers:test-driven-development` — failing test first per task.
  4. Invoke `superpowers:subagent-driven-development` — execute plan task by task. Per-task loop unchanged (DoD gate, QA gate, spec review, code-quality review).
  5. If any task is stuck > 15 min → invoke `superpowers:systematic-debugging`.
  6. Generate PR description (existing logic preserved — see step 4 of original numbering).
  7. Invoke `superpowers:finishing-a-development-branch` — push branch, PR already created with description and label.
  8. Update tracker `pr_url:` field. Set `status: pr-open`.
  9. **Arm babysitter:**
     ```
     ScheduleWakeup(
       delaySeconds=270,
       prompt="<<brocode-babysit:<slug>>>",
       reason="poll PR <slug>"
     )
     ```
  10. Print: `✅ TPM → <domain> PR raised (#<n>), babysitter armed (270s, cache-aware).`

  **Note:** Worktree is NOT deleted at end of develop mode. Babysitter cleans up only after PR merges. If PR never merges (escalated), worktree persists for user inspection until `/brocode develop --abandon=<slug>`.
````

- [ ] **Step 4: Strengthen superpowers wording at top of develop block**

Find the line `Check superpowers installed: \`claude plugin list | grep superpowers\`` and the subsequent install-instructions block. Immediately after that block, before the `Read ~/.brocode/config.json` line, insert:

```markdown
- **Mandatory superpowers chain:** develop mode MUST invoke the following skills in order, no skip:
  1. `superpowers:using-git-worktrees`
  2. `superpowers:writing-plans`
  3. `superpowers:test-driven-development`
  4. `superpowers:subagent-driven-development`
  5. `superpowers:systematic-debugging` (when stuck)
  6. `superpowers:finishing-a-development-branch`
  Skipping any of these is a develop-mode violation.
```

- [ ] **Step 5: Verify the file still has consistent step numbering**

Run: `grep -E "^\s+[0-9]+\." skills/brocode/modes/develop.md | head -20`

Expected: domain-loop sub-steps numbered 1–10. No gaps.

- [ ] **Step 6: Commit**

```bash
git add skills/brocode/modes/develop.md
git commit -m "Wire babysitter, worktree cap, queue, and threshold gate into develop mode"
```

---

## Task 11: Mirror develop changes into subcommands.md develop block

**Files:**
- Modify: `skills/brocode/modes/subcommands.md`

- [ ] **Step 1: Locate duplicate develop block**

Run: `grep -n "### \`develop\` / \`implement\`" skills/brocode/modes/subcommands.md`

Expected: header present once in subcommands.md (in addition to develop.md, which is a separate file).

- [ ] **Step 2: Replace duplicate body with reference**

Replace the entire `### \`develop\` / \`implement\`` block in subcommands.md (from header through its last bullet `Stop.`) with:

```markdown
### `develop` / `implement`
See `skills/brocode/modes/develop.md` — that file owns the full develop flow including the babysitter, worktree cap, queue, and threshold gate. Routing in `skills/brocode/SKILL.md` already directs `develop` / `implement` inputs there directly; this entry remains as a pointer for searches.
```

This eliminates the drift risk of two parallel definitions.

- [ ] **Step 3: Verify**

Run: `grep -A 3 "### \`develop\`" skills/brocode/modes/subcommands.md`

Expected: short pointer block, no duplicate detailed steps.

- [ ] **Step 4: Commit**

```bash
git add skills/brocode/modes/subcommands.md
git commit -m "Subcommands: replace duplicated develop block with pointer to develop.md"
```

---

## Task 12: Document new mode and config in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Locate the Commands and Repo Config sections**

Run: `grep -n "^## " CLAUDE.md`

Expected: list of top-level headings including `## Commands` and `## Repo Config`.

- [ ] **Step 2: Update Commands section**

In the `## Commands` table, add a row (or update the existing row) so it reads:

```markdown
| `skills/brocode/SKILL.md` | `/brocode:brocode <bug or feature>` · `/brocode:brocode repos` · `/brocode:brocode develop` · `/brocode:brocode review <url>` · `/brocode:brocode revise` · `/brocode:brocode assess <path>` · `/brocode:brocode status` |
```

- [ ] **Step 3: Add Flow summary entry for assess**

In the `## Flow summary` section, append a new sub-section:

```markdown
### Assess mode
\`\`\`
TPM writes instruction file → Tech Lead sub-agent dispatched
Tech Lead:
    spec input: read + score directly (5 spec dims)
    code input: dispatch Backend / Frontend / Mobile / SRE / QA in parallel (5 code dims)
    comparison input: run rubric per spec → side-by-side table → pick winner
Tech Lead writes .brocode/<id>/assessment.md
    → terminal headline with verdict + score
    → develop.md reads file later, blocks if overall < threshold
\`\`\`
```

- [ ] **Step 4: Add babysitter section**

After the `### Develop mode` block in Flow summary, append:

```markdown
### PR babysitter (post-develop autonomy)

After develop opens a PR:
- Tracker file `~/.brocode/code/task-<slug>.md` records state
- `ScheduleWakeup` polls every 270s (cache-aware; under prompt-cache 5-min TTL — pattern from ruflo-autopilot ADR-0001). Idle backoff to 900s after 3 no-op ticks.
- Each tick: address CI failures, review comments, rebase on conflict, auto-merge when approved
- Each tick appends one JSONL row to `~/.brocode/code/history.jsonl` (audit trail, ruflo worker-history pattern)
- Hard cap: 2 active worktrees (configurable via `worktree_cap`); excess tasks queue
- Severity classification: prefix match (`must:` / `good:` / `nit:`) or LLM batch
- On merge: worktree removed, tracker deleted, queued task promoted
- On stuck (>3 retries on same job/thread or semantic conflict): status=escalated, surface to user
```

- [ ] **Step 5: Update Repo Config example**

In the `## Repo Config` JSON example, add `min_score`, `dimension_weights`, and `worktree_cap` to one repo entry as illustration:

```json
{
  "path": "/path/to/api",
  "description": "Main REST API handling user accounts and billing",
  "labels": ["api", "billing"],
  "tags": ["node", "express", "postgres"],
  "min_score": 7,
  "dimension_weights": { "clarity": 1.5, "feasibility": 1.0 },
  "worktree_cap": 2
}
```

Add a sentence after the example: "`min_score`, `dimension_weights`, `worktree_cap` are optional; defaults are 7, equal, and 2."

- [ ] **Step 6: Update Context directory structure**

In the `## Context directory structure` block, add lines:

```markdown
~/.brocode/code/
  task-<slug>.md          ← per-task tracker (state machine, log, comment cache)
  history.log             ← merged tasks audit trail

.brocode/<id>/
  ...
  assessment.md           ← Tech Lead (assess mode) — multi-dim score + verdict
```

- [ ] **Step 7: Verify**

Run: `grep -c "assess" CLAUDE.md`

Expected: ≥ 3.

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md
git commit -m "Document assess mode, babysitter, status, and new repos.json fields"
```

---

## Task 13: Smoke test: invoke /brocode assess on this design doc

**Files:**
- No code change. Manual exercise.

- [ ] **Step 1: Run assess on the design spec**

Run (in Claude Code): `/brocode:brocode assess docs/superpowers/specs/2026-05-09-assess-mode-and-pr-babysitter-design.md`

Expected: SKILL.md routes to `assess.md`. Tech Lead is dispatched. `.brocode/<some-id>/assessment.md` is written. Terminal prints `🧪 Tech Lead → assessment N.N/10 (<verdict>) — .brocode/<id>/assessment.md`.

- [ ] **Step 2: Verify assessment.md schema**

Run: `cat .brocode/*/assessment.md | head -30`

Expected: matches `templates/assessment.md` skeleton — Overall line, Threshold line, Scores table with 5 spec dims, Strengths and Need Improvement sections.

- [ ] **Step 3: Smoke test failures, if any, are bugs in the implementation tasks above**

If assessment.md is missing, malformed, or routing fails, return to the failing task, fix, recommit, retry.

- [ ] **Step 4: Smoke test status (no active tasks expected)**

Run: `/brocode:brocode status`

Expected: `No active tasks.`

- [ ] **Step 5: Commit smoke test artifacts (optional)**

If smoke test produced .brocode/ artifacts you want to keep as a regression sample:

```bash
git add .brocode/
git commit -m "Smoke test: assess on design spec"
```

Otherwise: `rm -rf .brocode/assess-*` and skip commit.

---

## Self-Review

**Spec coverage check:**
- Change 1 (assess mode) → Tasks 1, 3, 5
- Change 2 (engineering-spec Section 11) → Tasks 7, 8, 9
- Change 3 (develop autonomy + babysitter + status) → Tasks 2, 4, 5, 6, 10, 11
- Documentation → Task 12
- Smoke test → Task 13

All 10 acceptance criteria from the spec map to tasks above.

**Placeholder scan:** No "TBD" / "implement later" / "similar to Task N" patterns. Each step has concrete commands or full markdown blocks.

**Type consistency:**
- Tracker frontmatter fields are spelled identically across Tasks 2, 4, 6, 10 (`slug`, `status`, `ci_retries`, `review_retries`, `pr_url`, `worktree`).
- Status enum values consistent across babysitter state machine, status table filter, and queue check filter (`coding|pr-open|ci-fixing|review-addressing|rebasing|merging|merged|escalated|queued`).
- ScheduleWakeup sentinel format is `<<brocode-babysit:<slug>>>` everywhere.
- Routing key matches sentinel: `starts with <<brocode-babysit:` in Task 5.
- File paths consistent (`~/.brocode/code/task-<slug>.md`, `templates/task-tracker.md`, `.brocode/<id>/assessment.md`).

---

## Open assumptions to validate during execution

- ScheduleWakeup runtime accepts arbitrary sentinel prompts and the harness routes them through SKILL.md the same way as user input. If not, fall back to user-driven `/loop 10m /brocode:brocode babysit <slug>` and document the fallback in babysitter.md. Test in Task 13 smoke test or earlier.
- `gh pr view ... --json mergeStateStatus` — confirm field name with `gh` version available. If not present in user's `gh`, switch to `mergeable` only and accept the safety guard gap.
- LLM batch classifier model: TPM defaults to `claude-haiku-4-5-20251001` per CLAUDE.md. Use the same model for severity classification. No new model wiring required.

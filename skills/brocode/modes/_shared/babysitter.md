# brocode: babysitter shared library
<!-- Loaded on demand by develop.md after PR opens, or on session resume by TPM, or on wakeup via SKILL.md routing -->

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

The sentinel `<<brocode-babysit:<slug>>>` is recognized at wake by SKILL.md routing (a row matches `starts with <<brocode-babysit:` and loads this file).

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
6. Update `last_action_at` to current ISO-8601 time. Append log entry to tracker `## Log` section AND append one JSONL row to `~/.brocode/code/history.jsonl` (see History log section).
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
{"ts":"<ISO-8601>","slug":"<slug>","status_before":"<prev>","status_after":"<new>","action":"<action-taken>","duration_ms":<int>,"outcome":"ok|fail|escalated","ci_retries":<int>,"review_retries":<int>}
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

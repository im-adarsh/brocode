# brocode: develop mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: develop / implement / "build it" -->

### `develop` / `implement`
If input is `develop` or `implement` or contains "implement the spec" / "start development" / "build it" / "code it":
- Check superpowers installed: `claude plugin list | grep superpowers`
- If NOT installed: output exactly —
  ```
  superpowers required for /brocode develop.
  Install: claude plugin install superpowers@claude-plugins-official --scope user
  Then restart Claude Code.
  ```
  Stop.
- Read `~/.brocode/config.json`. If missing, create with defaults (see Pre-flight: Config Read in agents/tpm.md). Use `engineering_rounds` value for max retry limits when escalating DoD/QA gate failures.
- Scan `.brocode/` for dirs with `engineering-spec.md` + `tasks.md`. If multiple, list and ask which. Record the directory name as `<id>` (e.g. `spec-20260429-oauth`) — all subsequent file paths use this value.
- Read `~/.brocode/repos.json` for repo paths.
- Read `tasks.md`. Tally `**Effort:**` fields. If no `**Effort:**` fields found in any task, print: `⚠️ TPM → no Effort fields in tasks.md — effort summary unavailable` and skip. Otherwise print:
  ```
  📋 TPM → effort summary: <N>S <N>M <N>L <N>XL — est. <range>h across <N> tasks
  ```
  Effort ranges: S = 0.5–1h · M = 1–3h · L = 3–8h · XL = 8h+. Sum low ends for min, high ends for max.
  If any XL task found, print: `⚠️ TPM → XL task detected: <TASK-ID> — consider breaking down before starting`
- For each domain with tasks (backend / web / mobile):
  1. Invoke `superpowers:using-git-worktrees` — create isolated worktree in that domain's repo for branch `brocode/<spec-id>-<domain>`
  2. Invoke `superpowers:writing-plans` — convert domain tasks from `tasks.md` into a superpowers plan at `docs/superpowers/plans/<spec-id>-<domain>.md` inside the worktree
  3. Invoke `superpowers:subagent-driven-development` — execute plan task by task inside the worktree. Per-task loop:
     a. Implementer subagent implements + self-reviews
     b. **DoD gate** — before spec compliance review, verify:
        - At least one commit exists for this task (`git log --oneline -1` non-empty)
        - Tests pass: run command from `~/.brocode/wiki/<repo-slug>/test-strategy.md`; fall back to repo tags in `~/.brocode/repos.json` (node → `npm test`, python → `pytest`, go → `go test ./...`)
        - No TODO/FIXME introduced by this task: `git diff HEAD~1 HEAD -- . | grep -E "TODO|FIXME"`
        - All `**DoD:**` per-task items confirmed: implementer must list each item explicitly in their DONE/DONE_WITH_CONCERNS message (e.g. "DoD: feature flag tested off ✅")
        If any check fails: re-dispatch implementer with specific failure. Log retry to `tpm-logs.md` as `E-NNN  [time]  TPM  → DoD retry <N>/2: <TASK-ID> — <reason>`. Max 2 retries → escalate to user.
        Print on pass: `✅ TPM → DoD gate passed: <TASK-ID>`
        Print on fail: `❌ TPM → DoD gate failed: <TASK-ID> — <reason>. Re-dispatching implementer.`
     c. **QA gate** — write `.brocode/<id>/instructions/qa-develop-<task-id>.md` with: worktree path, full task block, test cases, test command. Then dispatch QA sub-agent (`agents/qa.md`) with:
        - Worktree path
        - Full task block from `tasks.md` (the task being verified)
        - Relevant test cases from `.brocode/<id>/test-cases.md` for this task (match by task ID or domain)
        - Test command from `~/.brocode/wiki/<repo-slug>/test-strategy.md`
        QA runs tests, cross-checks coverage against `test-cases.md`, identifies missing test cases.
        QA reports PASS (all test cases covered, suite green) or FAIL (missing tests listed, failures quoted).
        On FAIL: re-dispatch implementer with QA findings. Log retry to `tpm-logs.md` as `E-NNN  [time]  TPM  → QA retry <N>/2: <TASK-ID> — <reason>`. Max 2 retries → escalate to user.
        Print on pass: `✅ TPM → QA passed: <TASK-ID> — <N>/<N> test cases covered, suite green`
        Print on fail: `❌ TPM → QA failed: <TASK-ID> — <N> missing test cases. Re-dispatching implementer.`
     d. Spec compliance review
     e. Code quality review
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
     - If any section source is missing: fill with `[NOT PROVIDED — update before merge]` and print: `⚠️ TPM → PR section missing: <section-name> — filled with placeholder`
     - Detect platform: `git remote get-url origin` — if contains `github.com` use `gh`, if contains `gitlab` use `glab`
     - Apply label `tool::brocode` at PR creation: `gh pr create --label "tool::brocode" --body "<description>"` or `glab mr create --label "tool::brocode" --description "<description>"`
     - Print: `📋 TPM → PR description generated from spec artifacts`
     - Print: `🏷️ TPM → label applied: tool::brocode`
  5. Invoke `superpowers:finishing-a-development-branch` — run tests and push branch only (PR already created in step 4 with generated description and label)
  6. Delete the worktree after PR is created: `git worktree remove --force <worktree-path>`
  7. Print: `✅ TPM → <domain> PR raised, worktree cleaned up`
- Run domains in parallel where possible (independent repos).

**Write `.brocode/<id>/evidence.md`** (after all domains complete):

```markdown
# Implementation Evidence
**Run ID:** [id]

## Test Results
| Domain | Command | Result |
|--------|---------|--------|
| [backend] | [npm test] | [42/42 pass] |

## PR Links
| Domain | PR URL | Status |
|--------|--------|--------|
| [backend] | [url] | OPEN |

## Worktree Map
| Domain | Branch | Worktree path | Status |
|--------|--------|---------------|--------|
| [backend] | [brocode/<id>-backend] | [/path] | CLEANED UP |
```

TPM logs: `E-NNN · ARTIFACT · TPM` — evidence.md written, N domains complete

- Stop.

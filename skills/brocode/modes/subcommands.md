# brocode: subcommands mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: repos / setup / revise / export-adrs -->

## First-Run Check

Before routing to any mode: check if `~/.brocode/repos.json` exists.

If it does NOT exist:
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

Parse input line by line. For each line matching `<domain>: <path> — <description> (<tags>)`:
1. Extract: domain (string before `:`), path (string between `:` and `—`), description (string between `—` and `(`), tags (comma-separated string inside `()`)
2. Validate path: run `ls <path>`. If not found: print `⚠️ path not found: <path> — re-enter or skip` and ask again.
3. Append to repos list. Labels default to `[]` — run `/brocode repos` after setup to add labels.

Before writing any file: run `mkdir -p ~/.brocode`.

After user types `done`:
- Write `~/.brocode/repos.json` in standard format (see `repos` subcommand for schema)
- Write `~/.brocode/config.json` with defaults (see Pre-flight: Config Read in agents/tpm.md)
- Print: `✅ brocode ready. Repos saved. Run /brocode <feature or bug> to start.`
- Continue from Step 1: Route with the original user input — do not re-evaluate the First-Run Check.

If user types `skip`:

- Run `mkdir -p ~/.brocode`
- Write `~/.brocode/config.json` with defaults only
- Print: `⚠️ brocode: no repos registered. Develop mode will not work. Run /brocode repos to add repos later.`
- Continue from Step 1: Route with the original user input — do not re-evaluate the First-Run Check.

---

## Step 0: Subcommands

### `revise` / `challenge`
If input is `revise` or `challenge` or contains "add constraint" / "throw it back" / "reopen" / "challenge decision":

This is a **revision run** — the user has reviewed the output artifacts and wants to rerun part of the loop with new constraints.

1. Scan `.brocode/` for completed runs (dirs containing `engineering-spec.md` or `product-spec.md`). If multiple, list and ask which.
2. Read `tpm-logs.md` from the selected run. Show the Reviewer Revision Requests table.
3. If the user provided new constraints in the input (e.g. "/brocode revise: make payment idempotent, scope to mobile only"), add a row to the Reviewer Revision Requests table referencing the most relevant D-NNN decision.
4. For each OPEN row in Reviewer Revision Requests:
   - Find the referenced D-NNN entry in the log
   - Determine which stage produced that decision (PM → product-spec.md, Tech Lead → implementation-options.md, etc.)
   - Write a new D-NNN entry: `[D-NNN] HH:MM · DECISION · [Producer] (revision of D-NNN per reviewer)` with the constraint captured in the options table
   - Mark the revision request row as RESOLVED
   - Rerun from that stage forward — all downstream agents must re-read the updated artifact and revise if affected
   - Skip stages whose inputs did not change
5. Product BR and Engineering BR re-review any revised artifacts (new round, max 2 rounds).
6. When all revision requests resolved: rewrite `engineering-spec.md` + `tasks.md` from approved revised artifacts.
7. Print: `✅ 📋 TPM → revision complete — [N] decisions updated, spec + tasks rewritten`
- Stop.

### `repos` / `setup`
If input is `repos` or `setup` or contains "register repo" / "set repo" / "add repo path":

1. Read `~/.brocode/repos.json` if it exists. Show current entries.
2. Ask user to provide repos as a free-form list — any domain name, any number of paths per domain:
   ```
   Register repos for engineer agents to read. Any domain name works.
   Format: <domain>: <path> (one per line). Multiple paths for same domain = multiple lines.
   Examples:
     backend: /path/to/api
     backend: /path/to/auth-service
     mobile: /path/to/ios-app
     web: /path/to/frontend
     terraform: /path/to/infra
     qa: /path/to/test-suite

   Type "done" when finished. Type "clear <domain>" to remove a domain.
   Current config: (show existing entries or "none")
   ```
3. For each provided path: run `ls <path>` to confirm it exists. Warn if not found, ask to confirm or skip.
4. For each confirmed path, ask (one prompt per repo):
   ```
   <path>
     Description (what does this repo do?): _
     Labels (comma-separated, e.g. api,billing,auth — optional): _
     Tags (comma-separated tech stack, e.g. node,postgres,redis — optional): _
   ```
5. Create `~/.brocode/` if it does not exist: `mkdir -p ~/.brocode`
6. Write `~/.brocode/repos.json` — domains are keys, values are arrays of repo objects:
   ```json
   {
     "backend": [
       {
         "path": "/path/to/api",
         "description": "Main REST API handling user accounts and billing",
         "labels": ["api", "billing"],
         "tags": ["node", "express", "postgres"]
       },
       {
         "path": "/path/to/auth-service",
         "description": "Authentication and token issuance service",
         "labels": ["auth", "security"],
         "tags": ["go", "jwt", "redis"]
       }
     ],
     "mobile": [
       {
         "path": "/path/to/ios",
         "description": "iOS app (Swift/SwiftUI)",
         "labels": ["ios"],
         "tags": ["swift", "swiftui"]
       }
     ],
     "updated_at": "YYYY-MM-DD"
   }
   ```
7. Print confirmation — one line per repo:
   ```
   Repos saved to ~/.brocode/repos.json
     backend   → /path/to/api           "Main REST API handling user accounts and billing"
     backend   → /path/to/auth-service  "Authentication and token issuance service"
     mobile    → /path/to/ios           "iOS app (Swift/SwiftUI)"
     web       → /path/to/frontend      "React web app"
   Engineer agents will read these paths. Run /brocode:brocode repos anytime to update.
   ```
8. When agents read `~/.brocode/repos.json`: match domain name to agent role (backend → Backend Engineer, mobile → Mobile Engineer, web/fullstack → Frontend Engineer, terraform/infra/sre → SRE, qa → QA). Pass all repo objects for that domain — agents must use `description`, `labels`, and `tags` to orient themselves before reading code. Unknown domains → Tech Lead assigns.
- Stop. Do not proceed.

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
- Stop.

### `review` / `code-review`
If input is `review` or `code-review` or contains "review this PR" / "review this MR" / "review the PR" / "review MR" or includes a GitHub/GitLab PR/MR URL:

- Extract the PR/MR URL from input. If none found, ask: "Paste the PR or MR URL to review."
- Check superpowers installed: `claude plugin list | grep superpowers`
- If NOT installed: output exactly —
  ```
  superpowers required for /brocode review.
  Install: claude plugin install superpowers@claude-plugins-official --scope user
  Then restart Claude Code.
  ```
  Stop.
- Print: `🤝 Tech Lead → starting code review on <url>`
- Dispatch **Tech Lead** sub-agent (reads `agents/tech-lead.md`):
  - Invoke `superpowers:code-review` skill with the PR/MR URL
  - Tech Lead reviews across all domains present in the diff: backend, frontend, mobile
  - For each domain in the diff, Tech Lead dispatches the relevant sub-agent (Backend / Frontend / Mobile) to review their layer in parallel
  - Sub-agents each produce domain-scoped review findings: bugs, security issues, perf concerns, design violations, missing tests
  - Tech Lead synthesizes all findings into a single review
  - For each finding, post an **inline comment** on the exact file+line in the PR/MR via the GitHub or GitLab API:
    - GitHub PR: `gh api repos/{owner}/{repo}/pulls/{pr}/comments` with `path`, `line`, `body`
    - GitLab MR: `glab api projects/{id}/merge_requests/{iid}/discussions` with `position.new_path`, `position.new_line`, `body`
  - Post a top-level summary comment on the PR/MR with: overall verdict (APPROVE / REQUEST_CHANGES), domain breakdown, critical vs non-critical count
- Print: `✅ Tech Lead → review posted — <N> inline comments on <url>`
- Stop.

### `export-adrs`
If input is `export-adrs` or contains "export adrs" / "generate adrs" / "export decisions":

1. If a run ID is provided in the input (e.g. `/brocode export-adrs spec-20260429-oauth`): use `.brocode/<id>/tpm-logs.md`
2. If no ID: scan `.brocode/` for all subdirectories containing `tpm-logs.md`. If exactly one found, use it. If multiple, list them and ask: "Which run? (paste the ID)"
3. Confirm `tpm-logs.md` exists at the path. If not: print `❌ No tpm-logs.md found at .brocode/<id>/tpm-logs.md` and stop.
4. Run ADR extraction (see ADR Extraction Procedure below).
5. Print: `📋 TPM → [N] ADRs written to .brocode/<id>/adrs/`
6. Stop.

---

## ADR Extraction Procedure

When instructed to run ADR extraction for a given run ID:

1. Read `.brocode/<id>/tpm-logs.md` in full
2. Find all blocks beginning with `### [D-` — each is one decision
3. For each D-NNN block, extract:
   - **ID**: the number from `D-NNN` → ADR number (e.g. D-003 → ADR-003)
   - **Agent**: the agent name after `· DECISION ·` in the header line
   - **Date**: the run date from the ID or from the earliest E-NNN timestamp
   - **Title**: the bold line `**[title]**` immediately after the header
   - **Options table**: the markdown table between the title and `**Chose:**`
   - **Chose**: the text after `**Chose:**`
   - **Rationale**: the paragraph after `**Rationale:**`
   - **Downstream impact**: the paragraph after `**Downstream impact:**`
   - **Revisit if**: the paragraph after `**Revisit if:**`
4. For each block, generate slug: title → lowercase → replace spaces with hyphens → strip non-alphanumeric except hyphens → truncate to first 6 words
5. Create directory `.brocode/<id>/adrs/` if it does not exist
6. Write one `.brocode/<id>/adrs/ADR-NNN-<slug>.md` per block using the format in `templates/adr.md`
7. Handle edge cases:
   - Missing "Revisit if" field → write `Revisit conditions not recorded.`
   - Missing options table → write `Options not recorded.`
   - Missing Rationale → write `Context not recorded.`
   - Missing "Downstream impact" field → write `Consequences not recorded.`
   - Malformed / truncated block (missing title or Chose line) → skip the block; record in index as `⚠️ ADR-NNN: incomplete block, skipped`
   - Zero D-NNN blocks found → write index only, with note: `No decisions recorded in this run.`
8. Write `.brocode/<id>/adrs/index.md`:

```markdown
# ADR Index — [spec-id]
Generated: YYYY-MM-DD

| ADR | Title | Decider | Downstream impact |
|-----|-------|---------|------------------|
| [ADR-001](ADR-001-<slug>.md) | [title] | [agent] | [one-line downstream impact, or "Not recorded"] |
```

9. Count total ADRs written (exclude skipped). That count is N in the print statement.

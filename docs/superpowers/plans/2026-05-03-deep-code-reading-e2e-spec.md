# Deep Code Reading, Product Knowledge, Agent Clarification & E2E Spec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make engineer agents read codebases broadly before narrowing, give PM access to product knowledge repos, let PM/Tech Lead/BRs ask clarifying questions, switch TPM to Haiku, and enforce E2E vertical-slice structure in engineering-spec.md and tasks.md.

**Architecture:** All changes are edits to agent markdown instruction files and one mode file. No new files created except the plan itself. Each task is a targeted edit to one agent file, validated by `bash scripts/validate.sh`.

**Tech Stack:** Markdown, bash (validate.sh)

---

## File Map

| File | Change |
|------|--------|
| `agents/tpm.md` | Model line → Haiku |
| `agents/pm.md` | Step 0.5 product knowledge read; clarification prompt section |
| `agents/tech-lead.md` | E2E engineering-spec sections mandate; E2E tasks.md sections mandate; clarification prompt section |
| `agents/swe-backend.md` | Step 1 broad read expansion + git freshness check |
| `agents/swe-frontend.md` | Step 1 broad read expansion + git freshness check |
| `agents/swe-mobile.md` | Step 1 broad read expansion + git freshness check |
| `agents/sre.md` | Step 1 broad read expansion + git freshness check |
| `agents/qa.md` | Step 1 broad read expansion + git freshness check |
| `agents/product-bar-raiser.md` | Clarification prompt section |
| `agents/engineering-bar-raiser.md` | Clarification prompt section; E2E checklist additions |
| `skills/brocode/modes/subcommands.md` | `repos` flow: add `product` domain prompt |
| `CLAUDE.md` | TPM model note; engineering-spec E2E sections; tasks.md E2E structure |
| `templates/engineering-spec.md` | Add all 14 E2E sections |

---

### Task 1: Switch TPM model to Haiku

**Files:**
- Modify: `agents/tpm.md:2`

- [ ] **Step 1: Read the file**

```bash
head -5 agents/tpm.md
```

Expected: line 2 is `**Model: claude-sonnet-4-6** — coordination, loop tracking, progress logging, blocker detection`

- [ ] **Step 2: Replace model line**

In `agents/tpm.md`, replace:
```
**Model: claude-sonnet-4-6** — coordination, loop tracking, progress logging, blocker detection
```
with:
```
**Model: claude-haiku-4-5** — orchestration only; reads, routes, writes instruction files, logs events
```

- [ ] **Step 3: Verify**

```bash
head -5 agents/tpm.md
bash scripts/validate.sh
```

Expected: line 2 shows Haiku model; validate.sh exits 0.

- [ ] **Step 4: Commit**

```bash
git add agents/tpm.md
git commit -m "feat: switch TPM model to Haiku — orchestration only, no deep reasoning needed"
```

---

### Task 2: Expand engineer agents — Step 1 broad read + git freshness check

**Files:**
- Modify: `agents/swe-backend.md` (Step 1 section)
- Modify: `agents/swe-frontend.md` (Step 1 section)
- Modify: `agents/swe-mobile.md` (Step 1 section)
- Modify: `agents/sre.md` (Step 1 section)
- Modify: `agents/qa.md` (Step 1 section)

The current Step 1 in engineer agents (backend/frontend/mobile) runs a surface scan and writes wiki. The SRE and QA Step 1 just reads the wiki. We expand all five to include:
1. A git freshness check before deciding whether to re-scan
2. A broad read of entry points, test dirs, key config, and service boundaries before narrowing to the bug/feature

- [ ] **Step 1: Read current Step 1 in swe-backend.md**

```bash
sed -n '22,60p' agents/swe-backend.md
```

Confirm it starts with `## Step 1: Knowledge base scan (before any analysis)` and ends before `## Step 2`.

- [ ] **Step 2: Replace Step 1 in swe-backend.md**

In `agents/swe-backend.md`, replace the entire block from `## Step 1: Knowledge base scan (before any analysis)` through the line `5. Append to \`~/.brocode/wiki/log.md\`:` block (inclusive of the closing code fence and blank line before `## Step 2`) with:

```markdown
## Step 1: Knowledge base scan + broad read (before any analysis)

### 1a. Freshness check

Read `~/.brocode/wiki/log.md`. Find your repo slug and last scan date.

Run:
```bash
git -C <repo-path> log --since="<last-scan-date>" --name-only --format="" | sort -u
```

- If no files changed since last scan AND scan < 7 days ago → read cached wiki pages and skip to Step 1c
- If files changed OR scan > 7 days ago → run the full scan below (Step 1b), then proceed to Step 1c

### 1b. Full scan (run only if freshness check requires it)

For each repo in `~/.brocode/repos.json` for your domain:
```bash
ls <repo-path>                                        # detect monorepo vs single-service
cat <repo-path>/CLAUDE.md 2>/dev/null                 # conventions, patterns, decisions
cat <repo-path>/AGENTS.md 2>/dev/null                 # agent-specific conventions if present
cat <repo-path>/package.json 2>/dev/null              # or go.mod / pubspec.yaml / Gemfile / pom.xml
ls <repo-path>/.github/workflows/ 2>/dev/null         # CI config
ls <repo-path>/packages/ <repo-path>/apps/ <repo-path>/services/ 2>/dev/null  # monorepo check
```

Re-read any files that changed since last scan (from freshness check output).

Write to `~/.brocode/wiki/<repo-slug>/` (create dir if needed):
- `overview.md` — repo pattern (monorepo/single-service/polyrepo), stack, structure summary, CI
- `patterns.md` — directory layout, service boundaries, naming conventions
- `conventions.md` — extracted from CLAUDE.md + observed code patterns
- `dependencies.md` — key deps, versions, external services, APIs consumed
- `test-strategy.md` — test runner, coverage approach, test file locations, patterns

Update `~/.brocode/wiki/index.md` — add or update entry:
```markdown
## <repo-slug>
Path: <repo-path>
Domain: <backend|frontend|mobile>
Pattern: <monorepo|single-service|polyrepo>
Stack: <comma-separated>
Last scanned: YYYY-MM-DD
Wiki: ~/.brocode/wiki/<repo-slug>/
```

Append to `~/.brocode/wiki/log.md`:
```
<repo-slug>  scanned  YYYY-MM-DD HH:MM  by Backend Engineer
```

### 1c. Broad read (always — before narrowing to bug/feature)

Read the codebase broadly to understand the system before narrowing to the specific problem. This is how a real engineer approaches an unfamiliar codebase.

```bash
# Entry points — understand where requests enter
find <repo-path> -maxdepth 3 -name "main.*" -o -name "app.*" -o -name "index.*" -o -name "server.*" 2>/dev/null | head -10
ls <repo-path>/src/ <repo-path>/lib/ <repo-path>/cmd/ 2>/dev/null   # top-level source dirs

# Test structure — understand what's covered and how tests are written
find <repo-path> -maxdepth 3 -type d -name "test*" -o -name "__tests__" -o -name "spec" 2>/dev/null | head -10

# Key service/module boundaries
ls <repo-path>/src/routes/ <repo-path>/src/handlers/ <repo-path>/src/services/ <repo-path>/src/models/ 2>/dev/null
```

Read:
1. 2–3 entry point files to understand request lifecycle
2. 1–2 test files to understand test patterns
3. Key config/schema files (migrations dir, ORM models, GraphQL schema if present)
4. Any file in the area of the bug/feature (from the instruction file) to orient before deep-dive

Then narrow to the specific bug/feature specified in your instruction file.
```

- [ ] **Step 3: Verify swe-backend.md**

```bash
grep -n "Step 1\|freshness\|broad read\|1a\|1b\|1c" agents/swe-backend.md | head -20
bash scripts/validate.sh
```

Expected: Step 1 sections 1a/1b/1c visible; validate.sh exits 0.

- [ ] **Step 4: Apply same Step 1 replacement to swe-frontend.md**

In `agents/swe-frontend.md`, find and replace the `## Step 1: Knowledge base scan (before any analysis)` block with the identical expanded Step 1 block from Step 2, replacing every mention of `Backend Engineer` with `Frontend Engineer` and domain `backend` with `frontend`.

The replacement block text (copy from swe-backend.md Step 1 you just wrote, then update):
- Line `by Backend Engineer` → `by Frontend Engineer`
- Domain hint `<backend|frontend|mobile>` stays as-is (it's a template placeholder)

```bash
grep -n "Frontend Engineer\|backend\|Backend" agents/swe-frontend.md | head -5   # confirm domain refs
```

- [ ] **Step 5: Apply same Step 1 replacement to swe-mobile.md**

Same as Step 4 but `Mobile Engineer` and domain `mobile`.

```bash
grep -n "Mobile Engineer\|mobile\|Mobile" agents/swe-mobile.md | head -5
```

- [ ] **Step 6: Expand SRE Step 1**

Current `agents/sre.md` Step 1 is minimal — just reads wiki index. Replace with:

In `agents/sre.md`, replace:
```markdown
## Step 1: Knowledge base scan

Read `~/.brocode/wiki/index.md` to understand infrastructure topology before assessing blast radius.
Read `~/.brocode/wiki/<repo-slug>/overview.md` for each relevant repo — CI and deploy patterns already cached there.
```

with:

```markdown
## Step 1: Knowledge base scan + broad read

### 1a. Freshness check

For each relevant repo in `~/.brocode/repos.json` (domains: `sre`, `terraform`, `infra`, `backend`, or any present):

```bash
git -C <repo-path> log --since="<last-scan-date>" --name-only --format="" | sort -u
```

Read `~/.brocode/wiki/log.md` for last scan date. If files changed OR scan > 7 days → re-read changed files and update `~/.brocode/wiki/<repo-slug>/overview.md`.

### 1b. Broad infrastructure read (always)

```bash
# Understand CI/CD and deploy pipeline
ls <repo-path>/.github/workflows/ 2>/dev/null
ls <repo-path>/infra/ <repo-path>/terraform/ <repo-path>/k8s/ <repo-path>/deploy/ 2>/dev/null

# Understand service topology
cat ~/.brocode/wiki/index.md
```

Read:
1. `~/.brocode/wiki/index.md` — full service topology
2. `~/.brocode/wiki/<repo-slug>/overview.md` for each relevant repo — CI and deploy patterns
3. 1–2 CI workflow files to understand deploy process and rollback hooks
4. Any infra/terraform files related to the component in scope

Then assess blast radius and ops impact for the specific change in your instruction file.
```

- [ ] **Step 7: Expand QA Step 1**

Current `agents/qa.md` Step 1 reads `test-strategy.md` only. Prepend a freshness check block.

In `agents/qa.md`, replace:
```markdown
## Step 1: Knowledge base — test strategy

Read `~/.brocode/wiki/<repo-slug>/test-strategy.md` before writing tests. Use the project's actual test runner, file naming conventions, and patterns. Do not invent a test structure — match what already exists.
```

with:

```markdown
## Step 1: Knowledge base — test strategy + broad read

### 1a. Freshness check

For each repo in `~/.brocode/repos.json` relevant to your test scope:

```bash
git -C <repo-path> log --since="<last-scan-date>" --name-only --format="" | sort -u
```

Read `~/.brocode/wiki/log.md` for last scan date. If test files changed OR scan > 7 days → re-read `~/.brocode/wiki/<repo-slug>/test-strategy.md` (and re-scan if needed).

### 1b. Broad test read (always)

```bash
# Find all test dirs and understand structure
find <repo-path> -maxdepth 4 -type d -name "test*" -o -name "__tests__" -o -name "spec" 2>/dev/null | head -15

# Sample 2-3 existing test files to understand patterns
```

Read:
1. `~/.brocode/wiki/<repo-slug>/test-strategy.md` — test runner, patterns, locations
2. 2–3 existing test files in the area of the feature/bug to understand naming, assertion style, mock patterns
3. Any test helpers, fixtures, or factories used by existing tests

Use the project's actual test runner, file naming conventions, and patterns. Do not invent a test structure — match what already exists.
```

- [ ] **Step 8: Verify all five agent files**

```bash
grep -n "1a\|1b\|1c\|freshness\|broad" agents/swe-backend.md agents/swe-frontend.md agents/swe-mobile.md agents/sre.md agents/qa.md
bash scripts/validate.sh
```

Expected: freshness/broad read sections visible in all five; validate.sh exits 0.

- [ ] **Step 9: Commit**

```bash
git add agents/swe-backend.md agents/swe-frontend.md agents/swe-mobile.md agents/sre.md agents/qa.md
git commit -m "feat: expand engineer agent Step 1 — broad code read + git freshness check before narrowing"
```

---

### Task 3: Add PM product knowledge read (Step 0.5)

**Files:**
- Modify: `agents/pm.md` (after Step 0, before main role description)

- [ ] **Step 1: Read PM Step 0 and surrounding context**

```bash
sed -n '1,25p' agents/pm.md
```

Confirm Step 0 ends and the role description (`---` separator + `You are a senior Product Manager`) follows.

- [ ] **Step 2: Insert Step 0.5 block**

In `agents/pm.md`, after the line:
```
Read `.brocode/<id>/instructions/pm-<phase>.md` FIRST. It specifies what brief to read, what to produce, and any constraints from the user.
```
and before the line:
```
Section 15 (UX Flows) must cover every persona defined in section 5 with:
```

Insert:

```markdown

## Step 0.5: Read product knowledge sources

Read `~/.brocode/repos.json`. Check if a `"product"` domain exists.

**If `product` domain has path entries:**
- For each path: read all `.md` files — PRDs, ADRs, roadmap docs, user research docs
- Extract: prior decisions, accepted tradeoffs, product principles, existing personas, known constraints
- Use this context when writing `product-spec.md` — do not contradict prior ADRs without flagging the conflict explicitly

**If `product` domain has URL entries:**
- Print: `📎 Product knowledge at <url> — open this before writing spec`
- If a Google Drive / Notion MCP is available, use it to read the document
- If no MCP: output exactly:
  ```
  INPUT BLOCKED: Cannot read <url>.
  Options:
  1. Paste the relevant sections directly in chat
  2. Install the relevant MCP (Google Drive / Notion / browser)
  ```
- Wait for user to provide content before proceeding

**If no `product` domain:** skip this step silently and proceed.

```

- [ ] **Step 3: Verify**

```bash
grep -n "Step 0.5\|product knowledge\|product domain\|INPUT BLOCKED" agents/pm.md | head -10
bash scripts/validate.sh
```

Expected: Step 0.5 visible; validate.sh exits 0.

- [ ] **Step 4: Commit**

```bash
git add agents/pm.md
git commit -m "feat: add PM Step 0.5 — read product knowledge repo/URL before writing product-spec"
```

---

### Task 4: Add clarification prompt format to PM, Tech Lead, Product BR, Engineering BR

**Files:**
- Modify: `agents/pm.md`
- Modify: `agents/tech-lead.md`
- Modify: `agents/product-bar-raiser.md`
- Modify: `agents/engineering-bar-raiser.md`

The clarification prompt format is the same for all four. Add it as a named section near the end of each agent's responsibilities section (before the escalation format or output format section).

**Clarification prompt block to insert** (identical in all four agents, agent name varies):

```markdown
## Clarification Protocol

When you hit ambiguity that code, docs, or prior artifacts cannot resolve, prompt the user before continuing. Do not guess or pick arbitrarily.

**When to prompt:**
- Conflicting sources with no clear winner (e.g., two PRDs that contradict each other)
- Missing information that blocks producing a correct artifact (e.g., no persona defined, no success metric)
- Priority or policy call only the user can make (e.g., "skip mobile for v1?")

**When NOT to prompt:**
- You can resolve it from existing artifacts — read them first
- It's a style or taste question — make a call and note it
- You already prompted once and got an answer — do not re-ask

**Format:**
```
❓ [Role name] → needs clarification before continuing:

[One clear question — what is ambiguous and why it matters]

Options:
A) [concrete option]
B) [concrete option]
C) [concrete option — or "Other: describe"]

Reply with A / B / C or free text.
```

**After user replies:**
1. Continue immediately — do not re-ask
2. Log decision in `tpm-logs.md`:
   ```
   D-NNN | [topic] | [chosen option] | Rationale: [user's reply] | Downstream impact: [what changes] | Revisit if: [never / condition]
   ```
3. If the decision changes an artifact already written, update it before moving on
```

- [ ] **Step 1: Read end of pm.md to find insertion point**

```bash
tail -30 agents/pm.md
```

Find the section just before the end (likely Output or Escalation section). Insert the clarification block before it.

- [ ] **Step 2: Add clarification block to pm.md**

In `agents/pm.md`, before the final `## Output` section (or equivalent last section), insert the clarification block above with `[Role name]` replaced by `PM`.

- [ ] **Step 3: Read end of tech-lead.md to find insertion point**

```bash
grep -n "^## " agents/tech-lead.md | tail -10
```

Find a section near the end (after Step 0.5 clarifying questions, before Key Rules). Insert after the existing `### Step 0.5` section.

- [ ] **Step 4: Add clarification block to tech-lead.md**

In `agents/tech-lead.md`, after the existing `### Step 0.5: Ask clarifying questions before dispatching` section (which covers pre-dispatch questions), add a new top-level section:

```markdown
## Clarification Protocol (during synthesis and spec writing)
```

Then insert the full clarification block with `[Role name]` replaced by `Tech Lead`. Note: Tech Lead's Step 0.5 covers pre-dispatch questions to PM/TPM. This protocol covers questions that arise *during synthesis or spec writing* — architectural calls the team cannot resolve without user input.

- [ ] **Step 5: Read product-bar-raiser.md structure**

```bash
grep -n "^## \|^### " agents/product-bar-raiser.md | head -20
```

Find insertion point (before Escalation Format or Key Rules section).

- [ ] **Step 6: Add clarification block to product-bar-raiser.md**

In `agents/product-bar-raiser.md`, before the `## Escalation Format` section, insert the clarification block with `[Role name]` replaced by `Product Bar Raiser`.

Adjust "When to prompt" for BR context:
- Replace `Conflicting sources with no clear winner` → `Challenge requires a user policy decision — not a spec gap the PM can fill alone`
- Replace `Missing information that blocks producing a correct artifact` → `After 2 rounds, the producer cannot resolve the challenge without a user call`

- [ ] **Step 7: Add clarification block to engineering-bar-raiser.md**

In `agents/engineering-bar-raiser.md`, before the `## Escalation Format` section, insert the clarification block with `[Role name]` replaced by `Engineering Bar Raiser`.

Adjust "When to prompt" for BR context:
- Replace `Conflicting sources with no clear winner` → `Challenge requires a user priority call (e.g., "scope mobile out of v1?")`
- Replace `Missing information that blocks producing a correct artifact` → `After 2 rounds, the producer cannot resolve the challenge without a user call`

- [ ] **Step 8: Verify all four files**

```bash
grep -n "Clarification Protocol\|❓\|Reply with A" agents/pm.md agents/tech-lead.md agents/product-bar-raiser.md agents/engineering-bar-raiser.md
bash scripts/validate.sh
```

Expected: clarification sections present in all four; validate.sh exits 0.

- [ ] **Step 9: Commit**

```bash
git add agents/pm.md agents/tech-lead.md agents/product-bar-raiser.md agents/engineering-bar-raiser.md
git commit -m "feat: add clarification prompt protocol to PM, Tech Lead, Product BR, Engineering BR"
```

---

### Task 5: Add product domain to repos subcommand

**Files:**
- Modify: `skills/brocode/modes/subcommands.md`

- [ ] **Step 1: Read the repos subcommand section**

```bash
sed -n '69,135p' skills/brocode/modes/subcommands.md
```

Confirm you see the free-form list prompt and the `repos.json` write step.

- [ ] **Step 2: Add product domain mention to the prompt text**

In `skills/brocode/modes/subcommands.md`, find the repos prompt block:
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
```

Replace with:
```
   Register repos for engineer agents to read. Any domain name works.
   Format: <domain>: <path or url> (one per line). Multiple paths for same domain = multiple lines.
   Examples:
     backend: /path/to/api
     backend: /path/to/auth-service
     mobile: /path/to/ios-app
     web: /path/to/frontend
     terraform: /path/to/infra
     qa: /path/to/test-suite
     product: /path/to/product-docs       ← PRDs, ADRs, roadmap (PM reads this)
     product: https://notion.so/workspace  ← also supports URLs for Notion/Confluence
```

- [ ] **Step 3: Add product domain to the domain→agent mapping note**

In `skills/brocode/modes/subcommands.md`, find the line:
```
When agents read `~/.brocode/repos.json`: match domain name to agent role (backend → Backend Engineer, mobile → Mobile Engineer, web/fullstack → Frontend Engineer, terraform/infra/sre → SRE, qa → QA). Pass all repo objects for that domain — agents must use `description`, `labels`, and `tags` to orient themselves before reading code. Unknown domains → Tech Lead assigns.
```

Replace with:
```
When agents read `~/.brocode/repos.json`: match domain name to agent role (backend → Backend Engineer, mobile → Mobile Engineer, web/fullstack → Frontend Engineer, terraform/infra/sre → SRE, qa → QA, product → PM). Pass all repo objects for that domain — agents must use `description`, `labels`, and `tags` to orient themselves before reading code. Unknown domains → Tech Lead assigns.

`product` entries support both `path` (local git repo or doc folder) and `url` (Notion, Confluence, Google Docs). URL entries are printed as a prompt for the PM to open; path entries are read directly.
```

- [ ] **Step 4: Add URL support to repos.json write step**

In `skills/brocode/modes/subcommands.md`, find the `repos.json` example:
```json
{
  "backend": [
    {
```

Add a `product` example after the existing domains:
```json
  "product": [
    {
      "path": "/path/to/product-docs",
      "description": "PRDs, ADRs, roadmap",
      "labels": ["prd", "adr"],
      "tags": ["markdown"]
    },
    {
      "url": "https://notion.so/my-workspace",
      "description": "Product wiki and user research",
      "labels": ["wiki"],
      "tags": ["notion"]
    }
  ]
```

- [ ] **Step 5: Verify**

```bash
grep -n "product\|url\|notion\|PM reads" skills/brocode/modes/subcommands.md | head -20
bash scripts/validate.sh
```

Expected: product domain documented; URL support mentioned; validate.sh exits 0.

- [ ] **Step 6: Commit**

```bash
git add skills/brocode/modes/subcommands.md
git commit -m "feat: add product domain to repos subcommand — PM can register PRDs, wikis, Notion URLs"
```

---

### Task 6: Enforce E2E vertical-slice structure in engineering-spec.md (Tech Lead + Engineering BR)

**Files:**
- Modify: `agents/tech-lead.md` (engineering-spec.md template — expand to 14 sections)
- Modify: `agents/engineering-bar-raiser.md` (final gate checklist — add E2E section checks)

The current `engineering-spec.md` template has 14 sections but they're backend-centric (no explicit Frontend, Mobile, Infrastructure, Deployment, Rollback as top-level sections). We replace the template header instruction and section list to enforce the full vertical slice.

- [ ] **Step 1: Read current engineering-spec template header in tech-lead.md**

```bash
sed -n '86,105p' agents/tech-lead.md
```

Confirm you see `### engineering-spec.md template` and the opening markdown block.

- [ ] **Step 2: Add E2E mandate before the template**

In `agents/tech-lead.md`, find the line:
```
### `engineering-spec.md` template
```

Insert before it:

```markdown
### E2E Spec Mandate

`engineering-spec.md` must cover the **full vertical slice** — every layer affected by the change. Tech Lead owns all sections. Mark sections "N/A — not affected" rather than omitting them.

**Required sections:**
1. Problem Statement — what, who, why this approach
2. System Context — mermaid diagram, all touched components + neighbours
3. User Flows Covered — persona table, ACs
4. API / Interface Contracts — every endpoint, request/response, errors
5. Data Layer — DB schema changes, migrations, data model
6. Business Logic — service layer, rules, edge cases
7. Frontend — UI components, state, API integration, error/empty states (or "N/A")
8. Mobile — iOS/Android screens, navigation, API integration (or "N/A")
9. Infrastructure — infra changes, env vars, secrets, dependencies (or "N/A")
10. Deployment — deploy steps, feature flags, staged rollout
11. Rollback — executable revert steps, migration reversal if needed
12. Monitoring & Alerting — metrics, alerts, SLOs, runbooks
13. Security — threat model, auth changes, data sensitivity
14. Testing — unit, integration, E2E test plan per layer, coverage table

Engineering Bar Raiser verifies all 14 sections are present and non-empty (or explicitly N/A) before approving.

```

- [ ] **Step 3: Expand tasks.md template to include all domain sections**

In `agents/tech-lead.md`, find the `### tasks.md template` section. After the existing `## Mobile Tasks` section in the template, add:

```markdown
## Infrastructure Tasks

### TASK-INFRA-01: [Short title]
**Domain:** infrastructure
**Status:** [ ]
**Depends on:** none
**Satisfies AC:** AC-N
**Effort:** [S | M | L | XL]

**Files:**
- Modify: `infra/terraform/...` or `k8s/...` or `.github/workflows/...`

**Implementation:**
[exact infra change, env var names, secret names, resource names]

---

## QA Tasks

### TASK-QA-01: [Short title]
...
```

And update the quality bar note to add: `Every domain section present — Backend / Web / Mobile / Infrastructure / QA. Mark "N/A — not in scope" if a domain has no tasks; do not omit the section.`

- [ ] **Step 4: Update Engineering BR final gate checklist**

In `agents/engineering-bar-raiser.md`, find the `Self-containment checklist` block under `## Final Gate`. After the existing checklist items, add:

```markdown
- [ ] Frontend section present — UI components, state, error/empty states (or explicitly N/A)
- [ ] Mobile section present — screens, navigation, API integration (or explicitly N/A)
- [ ] Infrastructure section present — env vars, secrets, resource changes (or explicitly N/A)
- [ ] Deployment section present — deploy steps, feature flags, staged rollout
- [ ] Rollback section present — executable steps, migration reversal if needed
- [ ] Monitoring section present — metrics, alerts, SLOs, runbooks
```

And update the `tasks.md` verification block to add:
```markdown
- [ ] All domain sections present: Backend / Web / Mobile / Infrastructure / QA (or marked N/A)
```

- [ ] **Step 5: Verify**

```bash
grep -n "E2E Spec Mandate\|vertical slice\|14 section\|Infrastructure Tasks\|TASK-INFRA\|Frontend section present\|Mobile section present" agents/tech-lead.md agents/engineering-bar-raiser.md
bash scripts/validate.sh
```

Expected: E2E mandate and new sections visible; validate.sh exits 0.

- [ ] **Step 6: Commit**

```bash
git add agents/tech-lead.md agents/engineering-bar-raiser.md
git commit -m "feat: enforce E2E vertical-slice in engineering-spec.md and tasks.md — all 14 sections required"
```

---

### Task 7: Update CLAUDE.md with TPM model, E2E spec structure, tasks.md structure

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read CLAUDE.md agent roster and key rules sections**

```bash
grep -n "tpm\|TPM\|engineering-spec\|tasks.md\|vertical\|E2E" CLAUDE.md | head -20
```

- [ ] **Step 2: Update TPM model note in agent roster**

In `CLAUDE.md`, find the TPM row in the agent roster table:
```
| `agents/tpm.md` | TPM — program orchestrator, logs all transitions | Cross-cutting |
```

No model is listed in the table — that's fine. Add a note in the Key Rules section instead.

Find in CLAUDE.md the `## Key rules for agents` section. After the last bullet, add:

```markdown
- TPM uses `claude-haiku-4-5` — orchestration only; model is set in `agents/tpm.md` line 2
```

- [ ] **Step 3: Add E2E spec note to Key Rules**

In CLAUDE.md `## Key rules for agents`, add:

```markdown
- `engineering-spec.md` must cover the full vertical slice — all 14 sections (see E2E Spec Mandate in `agents/tech-lead.md`); mark "N/A — not affected" rather than omit
- `tasks.md` is one file with sections per domain: Backend / Web / Mobile / Infrastructure / QA
```

- [ ] **Step 4: Verify**

```bash
grep -n "haiku\|vertical slice\|14 section\|tasks.md.*section" CLAUDE.md
bash scripts/validate.sh
```

Expected: new notes visible; validate.sh exits 0.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md — TPM model note, E2E spec mandate, tasks.md section structure"
```

---

### Task 8: Push branch

- [ ] **Step 1: Final validate**

```bash
bash scripts/validate.sh
```

Expected: exits 0.

- [ ] **Step 2: Push**

```bash
git push origin feat-v0.3
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| TPM → Haiku model | Task 1 |
| Engineer agents broad read + git freshness | Task 2 |
| PM product knowledge Step 0.5 | Task 3 |
| Clarification prompts: PM, Tech Lead, Product BR, Eng BR | Task 4 |
| `product` domain in repos subcommand | Task 5 |
| E2E spec 14 sections mandate in Tech Lead | Task 6 |
| E2E tasks.md domain sections | Task 6 |
| Engineering BR E2E checklist additions | Task 6 |
| CLAUDE.md updated | Task 7 |

All spec requirements covered. No placeholders. No TBDs. validate.sh referenced for every task.

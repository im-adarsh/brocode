# brocode v0.3-F: Config + First-Run Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `~/.brocode/config.json` with configurable BR rounds and model overrides, replace hardcoded round limits in tpm.md + brocode.md, add first-run onboarding when repos.json is missing, and surface user decision points via AskUserQuestion.

**Architecture:** Additive edits to `agents/tpm.md` and `commands/brocode.md`. No new files created. Config is read-only by the orchestrator — sub-agents receive model overrides via instruction files only.

**Tech Stack:** Markdown (agent files), JSON (config schema).

---

### Task 1: Add config read to tpm.md pre-flight + replace hardcoded round limits

**Files:**
- Modify: `agents/tpm.md`

- [ ] **Step 1: Read the file**

Read `agents/tpm.md` in full. Note every instance of "max 3 rounds", "max 2 rounds", "round > 3", "3 BR rounds", "2 rounds" — these are the hardcoded limits to replace.

- [ ] **Step 2: Add config read block to Instruction File Protocol section**

In `agents/tpm.md`, after the Quick Reference block and before the Instruction File Protocol section, insert this new section:

```markdown
## Pre-flight: Config Read

Before ANY sub-agent dispatch, read `~/.brocode/config.json`. If the file does not exist, create it with defaults:

```json
{
  "br_rounds": {
    "product": 3,
    "engineering": 3,
    "final_check": 2
  },
  "models": {},
  "superpowers_min_version": "5.0.0",
  "updated_at": "YYYY-MM-DD"
}
```

Bind values for use throughout the run:
- `product_rounds` = `config.br_rounds.product` (default 3)
- `engineering_rounds` = `config.br_rounds.engineering` (default 3)
- `final_check_rounds` = `config.br_rounds.final_check` (default 2)

**Model overrides:** For each instruction file written, check `config.models[<role-slug>]`. Role slugs: `tpm`, `pm`, `tech_lead`, `sre`, `qa`, `swe_backend`, `swe_frontend`, `swe_mobile`, `product_br`, `engineering_br`. If key exists, append to instruction file:
```
Model override: <value>
```
Sub-agent reads this line and uses the specified model instead of their agent-file default.

Print: `📋 TPM → config loaded: product_rounds=<N> engineering_rounds=<N> final_check_rounds=<N>`
```

- [ ] **Step 3: Replace hardcoded round limits in tpm.md**

Search `agents/tpm.md` for all occurrences of round-limit language. Replace each:
- `max 3 rounds` → `max <product_rounds> rounds` (product BR contexts) or `max <engineering_rounds> rounds` (engineering BR contexts)
- `max 2 rounds` → `max <final_check_rounds> rounds`
- `round > 3` → `round > <product_rounds>` or `round > <engineering_rounds>` depending on context
- `BR round > 3` → `BR round > <engineering_rounds>`

In the Stall Detection table, update:
- `BR round hits 4` → `BR round hits <engineering_rounds + 1>`

- [ ] **Step 4: Add model override line to Instruction File Protocol template**

In the Instruction File Protocol section, the template block shows the instruction file format. Add `Model override: <value>  (only if config.models[<role>] set)` as a conditional line at the end of the template, with a note: "Omit this line if no model override is configured for this role."

- [ ] **Step 5: Commit**

```bash
git add agents/tpm.md
git commit -m "feat: add config read pre-flight and configurable BR rounds to tpm.md"
```

---

### Task 2: Add first-run onboarding to brocode.md

**Files:**
- Modify: `commands/brocode.md`

- [ ] **Step 1: Read the file**

Read `commands/brocode.md`. Note the structure of Step 0 subcommands and the Pre-flight section at the start of INVESTIGATE and SPEC flows. The first-run check must fire before any mode routing.

- [ ] **Step 2: Add first-run check before Step 0 routing**

At the very top of the orchestration flow, before `## Step 0: Subcommands`, insert:

```markdown
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
3. Append to repos list.

After user types `done`:
- Write `~/.brocode/repos.json` in standard format (see repos subcommand for schema)
- Write `~/.brocode/config.json` with defaults (see Pre-flight: Config Read in agents/tpm.md)
- Print: `✅ brocode ready. Repos saved. Run /brocode <feature or bug> to start.`
- Continue with the original user input — do not re-prompt.

If user types `skip`:
- Write `~/.brocode/config.json` with defaults only
- Print: `⚠️ brocode: no repos registered. Develop mode will not work. Run /brocode repos to add repos later.`
- Continue with the original user input.
```

- [ ] **Step 3: Add config read to develop pre-flight**

In the `develop` / `implement` subcommand block, after the superpowers check and before scanning `.brocode/` for spec dirs, add:

```
- Read `~/.brocode/config.json`. If missing, create with defaults (see Pre-flight: Config Read in agents/tpm.md).
- Use `engineering_rounds` for DoD/QA gate retry limits when escalating.
```

- [ ] **Step 4: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: add first-run onboarding and config read to brocode.md"
```

---

### Task 3: Add user decision points protocol to tpm.md

**Files:**
- Modify: `agents/tpm.md`

- [ ] **Step 1: Add decision point protocol section**

In `agents/tpm.md`, after the Coordination Protocol section (On DISPATCH, On ARTIFACT, etc.), add:

```markdown
## User Decision Points

TPM surfaces key architectural choices to the user using `AskUserQuestion` — proactively, not only on BR failure.

**When to invoke AskUserQuestion:**
- Two implementation options with fundamentally different architecture (sync vs async, build vs buy, monolith vs service)
- Product direction fork where options produce different UX for end users
- Scope ambiguity affecting effort by more than one size tier (e.g. M vs XL)

**When NOT to invoke AskUserQuestion:**
- Minor style tradeoffs, naming choices, or low-stakes implementation details
- Decisions already captured in engineering-spec.md or brief.md
- Tech Lead or PM has already resolved the question in a thread

**Format:**
```
🤔 TPM → decision needed: [D-NNN title]

Option A: [name] — [1 sentence describing the approach]. Est. effort: [S/M/L/XL]
Option B: [name] — [1 sentence describing the approach]. Est. effort: [S/M/L/XL]
Option C: Let brocode decide (recommend: A — [brief reason])
```

Log the user's response as `D-NNN · DECISION · User` in tpm-logs.md with a full options table.

Non-blocking observations (minor tradeoffs, style, low-stakes choices) go to `tpm-logs.md` only — never surface to user.
```

- [ ] **Step 2: Commit**

```bash
git add agents/tpm.md
git commit -m "feat: add user decision points protocol to tpm.md"
```

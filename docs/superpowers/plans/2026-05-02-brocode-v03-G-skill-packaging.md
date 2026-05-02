# brocode v0.3-G: Skill Packaging Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move brocode orchestration from one 800-line `commands/brocode.md` (loaded every run) into a routing SKILL.md (~50 lines) + 5 mode files (~150–300 lines each, loaded on demand). Token reduction: ~6,000 → ~1,500–2,500 tokens per run.

**Architecture:** Create `skills/brocode/SKILL.md` (entry point + routing table). Create `skills/brocode/modes/` with 5 files: investigate.md, spec.md, develop.md, review.md, subcommands.md. Content moved from `commands/brocode.md` (not duplicated). Replace `commands/brocode.md` with a redirect stub. Update `CLAUDE.md` paths.

**Tech Stack:** Markdown only. No new dependencies.

**Dependency:** Run after Sub-project E (CI validation passes before splitting).

---

### Task 1: Create skills/brocode/SKILL.md entry point

**Files:**
- Create: `skills/brocode/SKILL.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p skills/brocode/modes
```

- [ ] **Step 2: Write SKILL.md**

Create `skills/brocode/SKILL.md`:

```markdown
---
description: "Multi-agent SDLC. One command. Full engineering org."
---
{{args}}

## Quick Reference
**Modes:** INVESTIGATE · SPEC · DEVELOP · REVIEW · subcommands
**Step 0 subcommands:** revise · repos · develop · review · export-adrs
**Investigate flow:** Pre-flight → Tech Lead → parallel team → Engineering BR → spec → ADRs
**Spec flow:** Pre-flight → PM → Product BR gate → Tech Lead → parallel team → Engineering BR → spec → ADRs
**Read in full when:** First run in a session or ambiguous input

## Step 0: Route to mode file

Detect mode from input, then read ONLY the relevant mode file:

| Input matches | Load |
|--------------|------|
| bug / crash / error / broken / flaky / incident / "why is X" / "stopped working" | `skills/brocode/modes/investigate.md` |
| feature / spec / build / design / add / new / PRD / "build X" / "add Y" | `skills/brocode/modes/spec.md` |
| develop / implement / "build it" / "code it" / "start development" | `skills/brocode/modes/develop.md` |
| review / PR URL / MR URL / "review this" / "code review" | `skills/brocode/modes/review.md` |
| repos / setup / revise / challenge / export-adrs / "add constraint" | `skills/brocode/modes/subcommands.md` |

Do NOT read other mode files. Do NOT read `commands/brocode.md`.
After reading the mode file, follow its instructions exactly.

If input is ambiguous between INVESTIGATE and SPEC, ask one question: "Is this a bug to investigate or a feature to spec?"
```

- [ ] **Step 3: Verify the file was created correctly**

Read `skills/brocode/SKILL.md` and confirm: frontmatter present, routing table has 5 rows, no typos in file paths.

- [ ] **Step 4: Commit**

```bash
git add skills/brocode/SKILL.md
git commit -m "feat: add skills/brocode/SKILL.md routing entry point"
```

---

### Task 2: Create modes/subcommands.md

**Files:**
- Create: `skills/brocode/modes/subcommands.md`

- [ ] **Step 1: Read the subcommands section from brocode.md**

Read `commands/brocode.md` lines 1–219. This contains: Step 0 subcommands (`revise`, `repos`, `develop`, `review`, `export-adrs`) and the ADR Extraction Procedure. Copy these sections to the mode file.

- [ ] **Step 2: Write subcommands.md**

Create `skills/brocode/modes/subcommands.md` with:
- The First-Run Check block (added by Sub-project F)
- The full `revise` / `challenge` subcommand block
- The full `repos` / `setup` subcommand block
- The `develop` routing note (points to develop.md)
- The `review` routing note (points to review.md)
- The `export-adrs` subcommand block
- The ADR Extraction Procedure section

Do NOT include: INVESTIGATE flow, SPEC flow, DEVELOP flow, REVIEW flow — those are in their own mode files.

Add at the top:
```markdown
# brocode: subcommands mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: repos / setup / revise / export-adrs -->
```

- [ ] **Step 3: Commit**

```bash
git add skills/brocode/modes/subcommands.md
git commit -m "feat: add skills/brocode/modes/subcommands.md"
```

---

### Task 3: Create modes/investigate.md

**Files:**
- Create: `skills/brocode/modes/investigate.md`

- [ ] **Step 1: Read the INVESTIGATE flow from brocode.md**

Read `commands/brocode.md` from `## Step 2: INVESTIGATE flow` through the Iron laws section (approximately lines 236–442). This is the full investigate flow content to move.

- [ ] **Step 2: Write investigate.md**

Create `skills/brocode/modes/investigate.md` with:
- The full INVESTIGATE Pre-flight section
- The Org chart for investigate mode
- The Instruction file protocol
- Phase 1: Tech Lead triage + clarifying questions
- Phase 2: Engineering BR loop (with configurable round limits: use `<engineering_rounds>` variable from config)
- Iron laws

Replace all hardcoded `round > 3` with `round > <engineering_rounds>` and `max 2 rounds` with `max <final_check_rounds> rounds` (these reference config values bound at pre-flight in tpm.md).

Add at the top:
```markdown
# brocode: investigate mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: bug / crash / error / broken -->
```

- [ ] **Step 3: Commit**

```bash
git add skills/brocode/modes/investigate.md
git commit -m "feat: add skills/brocode/modes/investigate.md"
```

---

### Task 4: Create modes/spec.md (incorporating Sub-project K changes)

**Files:**
- Create: `skills/brocode/modes/spec.md`

- [ ] **Step 1: Read the SPEC flow from brocode.md**

Read `commands/brocode.md` from `## Step 3: SPEC flow` to the end (approximately lines 445–end). This contains: Pre-flight, Phase 1 (Product Track with PM + Designer + Product BR loop), Phase 2 (Engineering Track), post-run.

- [ ] **Step 2: Write spec.md with Sub-project K changes applied**

Create `skills/brocode/modes/spec.md` with:
- Full SPEC Pre-flight
- The Org chart (already updated by Sub-project K: no Designer)
- Phase 1 Product Track:
  - Step 1a: PM dispatch (instruction: produce product-spec.md including all 15 sections; section 15 = UX flows covering every persona)
  - **Remove Step 1b Designer entirely**
  - Step 1c: Product BR loop — reviews `product-spec.md` only (not ux.md); gate opens when product-spec.md approved
- Phase 2 Engineering Track: unchanged structure, but update all references removing `ux.md` — Tech Lead reads `product-spec.md` only

Replace hardcoded round limits with config variable references (`<product_rounds>`, `<engineering_rounds>`, `<final_check_rounds>`).

Update the TodoWrite initial list (remove `🎨 Designer → ux.md` item).

Add at the top:
```markdown
# brocode: spec mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: feature / spec / build / design -->
```

- [ ] **Step 3: Commit**

```bash
git add skills/brocode/modes/spec.md
git commit -m "feat: add skills/brocode/modes/spec.md (Designer removed, PM owns UX flows)"
```

---

### Task 5: Create modes/develop.md and modes/review.md

**Files:**
- Create: `skills/brocode/modes/develop.md`
- Create: `skills/brocode/modes/review.md`

- [ ] **Step 1: Read the develop and review sections from brocode.md**

Read `commands/brocode.md` develop section (the `develop` / `implement` subcommand block, lines ~107–182) and review section (`review` / `code-review` block, lines ~184–208).

- [ ] **Step 2: Write develop.md**

Create `skills/brocode/modes/develop.md` with the full develop flow content:
- Superpowers check
- `.brocode/` scan for spec dirs + `<id>` binding
- `~/.brocode/repos.json` read
- Effort summary tally
- Per-domain loop: worktree → writing-plans → subagent-driven-development → DoD gate → QA gate → spec review → quality review → PR description generation → finishing-a-development-branch → worktree cleanup

Add at the top:
```markdown
# brocode: develop mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: develop / implement / "build it" -->
```

- [ ] **Step 3: Write review.md**

Create `skills/brocode/modes/review.md` with the full review flow:
- PR/MR URL extraction
- Superpowers check
- Tech Lead dispatch with code-review skill
- Inline comment posting via gh / glab
- Top-level summary comment

Add at the top:
```markdown
# brocode: review mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: review / PR URL / MR URL -->
```

- [ ] **Step 4: Commit**

```bash
git add skills/brocode/modes/develop.md skills/brocode/modes/review.md
git commit -m "feat: add skills/brocode/modes/develop.md and review.md"
```

---

### Task 6: Replace commands/brocode.md with redirect stub + update CLAUDE.md

**Files:**
- Modify: `commands/brocode.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace commands/brocode.md**

Read `commands/brocode.md` to verify all content is captured in the 5 mode files. Then replace its content with:

```markdown
---
description: "Multi-agent SDLC orchestrator. Investigates bugs, produces specs, and implements features using your engineering org simulation."
---
<!-- This file is superseded by skills/brocode/SKILL.md -->
<!-- Kept for backwards compatibility with cached invocations -->
See `skills/brocode/SKILL.md` for current orchestration logic.

If you are reading this file, read `skills/brocode/SKILL.md` instead and follow its instructions.
```

- [ ] **Step 2: Update CLAUDE.md Commands table**

Read `CLAUDE.md`. Find the Commands table. Update the brocode.md entry:

Before:
```
| `commands/brocode.md` | `/brocode:brocode <bug or feature>` · ...
```

After:
```
| `skills/brocode/SKILL.md` | `/brocode:brocode <bug or feature>` · `/brocode:brocode repos` · `/brocode:brocode develop` · `/brocode:brocode review <url>` · `/brocode:brocode revise` |
```

Add a note in the Commands section: `commands/brocode.md` is a backwards-compatibility redirect stub.

- [ ] **Step 3: Run validation**

```bash
bash scripts/validate.sh
```

Expected: `✅ validate: all checks passed`

If any broken reference errors appear (e.g. validate.sh checks `commands/brocode.md` for dangerous commands), the redirect stub won't contain `git reset --hard` — that check should pass.

- [ ] **Step 4: Commit**

```bash
git add commands/brocode.md CLAUDE.md
git commit -m "feat: replace commands/brocode.md with redirect stub — skill packaging complete"
```

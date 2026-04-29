# Token Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce tokens consumed per brocode run via five mechanisms: compressed instruction files per role, Quick Reference headers in large agent files, thread summarization, wiki compaction, and live TodoWrite tracking across all modes.

**Architecture:** All changes are additive edits to existing markdown agent files and commands/brocode.md. No new files created except compacted wiki versions (written in place). TPM enforces all runtime mechanisms inline. Quick Reference headers are static additions to the top of three files.

**Tech Stack:** Markdown edits only. No code dependencies. All three target files: `commands/brocode.md` (729 lines), `agents/tpm.md` (587 lines), `agents/tech-lead.md` (488 lines).

---

## File Structure

| File | Mechanisms | Change type |
|------|-----------|-------------|
| `commands/brocode.md` | 1, 2, 3, 5 | Modify — add scoped include rules, QR header, summary-only rule, TodoWrite calls |
| `agents/tpm.md` | 2, 3, 4, 5 | Modify — add QR header, thread summarization step, wiki compaction step, TodoWrite calls |
| `agents/tech-lead.md` | 2 | Modify — add QR header only |

Tasks 1–3 modify different files → can be dispatched in parallel.
Tasks 4 and 5 both modify `agents/tpm.md` → must be sequential after Task 1.
Task 5 (TodoWrite in commands/brocode.md) extends Task 1's work → sequential after Task 1.

**Sequencing:**
- Task 1: `commands/brocode.md` — scoped instruction rules + QR header
- Task 2: `agents/tech-lead.md` — QR header (independent, parallel with Task 1)
- Task 3: `agents/tpm.md` — QR header + thread summarization + wiki compaction + TodoWrite calls
- Task 4: `commands/brocode.md` — TodoWrite calls for all three modes (extends Task 1)

---

### Task 1: Quick Reference header — commands/brocode.md + scoped instruction rules

**Files:**
- Modify: `commands/brocode.md` lines 1–12 (after frontmatter, before Step 0)
- Modify: `commands/brocode.md` — PM instruction block (line ~399), Designer block (~420), Tech Lead blocks, SRE/QA instruction notes

**Verification:** `grep -n "Quick Reference" commands/brocode.md` → finds the new section; `grep -n "Files to read:" commands/brocode.md` → shows scoped file lists per role

- [ ] **Step 1: Read the current file top**

Open `commands/brocode.md`. Confirm line 1 is the `---` frontmatter opener and the orchestrator intro is at line 4.

Run: `head -15 commands/brocode.md`
Expected: YAML frontmatter + "You are the brocode orchestrator" line visible

- [ ] **Step 2: Add Quick Reference header to commands/brocode.md**

Insert the following block after line 7 (after `{{args}}` and before the first `---` separator), making it the first content a dispatched agent reads:

```markdown
## Quick Reference
**Modes:** INVESTIGATE (bug/crash/error) · SPEC (feature/design/build) · DEVELOP · REVIEW · subcommands
**Step 0 subcommands:** `revise` · `repos` · `develop` · `review` · `export-adrs`
**Investigate flow:** Pre-flight → Tech Lead triage → parallel engineers + SRE + QA → Engineering BR loop → final spec → ADRs
**Spec flow:** Pre-flight → PM → Designer → Product BR gate → Tech Lead → parallel team → Engineering BR loop → final spec → ADRs
**Read in full when:** First run in a session, unfamiliar mode, or user input is ambiguous between modes
```

- [ ] **Step 3: Tighten PM instruction file — scope Files to read**

In `commands/brocode.md`, find the PM instruction block (search for `# Instruction: PM — phase 1`). Replace the `Files to read` line:

Old:
```
Files to read: .brocode/<id>/brief.md
```

New:
```
Files to read: .brocode/<id>/brief.md
  (Do NOT read product-spec.md, ux.md, or thread files — not yet written)
```

- [ ] **Step 4: Tighten Designer instruction file — scope Files to read**

Find the Designer instruction block (`# Instruction: Designer — phase 1`). Replace the `Files to read` line:

Old:
```
Files to read: .brocode/<id>/product-spec.md, .brocode/<id>/threads/ (any existing)
```

New:
```
Files to read: .brocode/<id>/product-spec.md
  Threads: read .brocode/<id>/threads/ (Summary sections only if thread > 50 lines)
  (Do NOT read ux.md — not yet written. Do NOT read ops.md, test-cases.md — not your scope)
```

- [ ] **Step 5: Tighten Tech Lead phase 2 instruction — scope tpm-logs.md**

Find the Tech Lead phase 2 instruction block (`# Instruction: Tech Lead — phase 2 (spec)`). Replace the `Files to read` line:

Old:
```
Files to read: .brocode/<id>/product-spec.md, .brocode/<id>/ux.md,
               .brocode/<id>/threads/tech-lead-ready.md,
               ~/.brocode/repos.json, ~/.brocode/wiki/index.md
```

New:
```
Files to read: .brocode/<id>/product-spec.md, .brocode/<id>/ux.md,
               .brocode/<id>/threads/tech-lead-ready.md,
               .brocode/<id>/tpm-logs.md (D-NNN decision blocks only — skip E-NNN events),
               ~/.brocode/repos.json, ~/.brocode/wiki/index.md
  (Do NOT read ops.md, test-cases.md — not yet written at this stage)
```

- [ ] **Step 6: Add scoped include rule for SRE + QA in Phase 2 Tech Lead dispatch block**

Find the block that lists what each instruction tells the sub-agent (search for `Each instruction tells the sub-agent`). After the existing bullets, append:

```markdown
- SRE instruction: include only `brief.md` blast-radius section + `implementation-options.md` architecture decision section. Do NOT include full product-spec.md or ux.md.
- QA instruction: include only `brief.md` acceptance-criteria section + `implementation-options.md` test surface section. Do NOT include full product-spec.md or ux.md.
- Backend / Frontend / Mobile instructions: include only their domain section of `brief.md` + their domain's thread files + `~/.brocode/wiki/<their-repo-slug>/` only.
- Engineering BR instruction: include the one artifact being challenged only. Do NOT include all three eng artifacts at once.
```

- [ ] **Step 7: Verify scoped rules visible in both INVESTIGATE and SPEC flows**

Run: `grep -n "Do NOT include\|Do NOT read\|D-NNN decision blocks only" commands/brocode.md`
Expected: at least 6 lines found, spread across investigate and spec flow sections

- [ ] **Step 8: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: add Quick Reference header + scoped instruction file rules to brocode.md"
```

---

### Task 2: Quick Reference header — agents/tech-lead.md

**Files:**
- Modify: `agents/tech-lead.md` lines 1–3 (after the role + model line)

**Verification:** `head -20 agents/tech-lead.md` → Quick Reference block visible immediately after role line

- [ ] **Step 1: Read the current file top**

Run: `head -10 agents/tech-lead.md`
Expected: `# Role: Tech Lead` at line 1, `## Step 0: Read your instruction file` around line 5

- [ ] **Step 2: Insert Quick Reference block**

Insert the following after line 2 (after `**Model: claude-sonnet-4-6**...` line), before `## Step 0`:

```markdown

## Quick Reference
**Produces:** `investigation.md` (investigate) · `implementation-options.md` (spec) · `engineering-spec.md` · `tasks.md`
**Key decisions to log:** domain scope chosen · implementation option chosen · each BR revision choice
**Flow paths:**
- Investigate mode → Step 0 (read instruction) → Step 0.5 (clarifying questions) → Step 1 (write instruction files) → Step 2 (dispatch parallel) → Step 3 (synthesize) → Step 4 (write final spec after BR)
- Spec mode → same sequence with implementation-options.md instead of investigation.md
**Read in full when:** First dispatch in a session · BR escalation · revise mode · cross-domain investigation with contradictory symptoms
```

- [ ] **Step 3: Verify**

Run: `grep -n "Quick Reference" agents/tech-lead.md`
Expected: 1 match at line ~3

- [ ] **Step 4: Commit**

```bash
git add agents/tech-lead.md
git commit -m "feat: add Quick Reference header to agents/tech-lead.md"
```

---

### Task 3: agents/tpm.md — Quick Reference header + thread summarization + wiki compaction + TodoWrite calls

**Files:**
- Modify: `agents/tpm.md` — insert QR header after line 2; add thread summarization to Post-BR-Round coordination protocol; add wiki compaction to Post-Run section; add TodoWrite calls at every dispatch block

**Verification:**
- `grep -n "Quick Reference" agents/tpm.md` → 1 match near top
- `grep -n "Thread Summarization\|wiki compaction\|TodoWrite" agents/tpm.md` → matches in correct sections
- `grep -n "TodoWrite" agents/tpm.md` → appears at DISPATCH, ARTIFACT, APPROVE, COMPLETE blocks

- [ ] **Step 1: Read the file top and Post-Run section**

Run: `head -10 agents/tpm.md`
Expected: `# Role: Technical Program Manager (TPM)` at line 1

Run: `grep -n "Post-Run\|brocode.md Retrospective\|ADR extraction\|Coordination Protocol\|On DISPATCH\|On APPROVE\|On COMPLETE" agents/tpm.md`
Expected: line numbers for each section to know insertion points

- [ ] **Step 2: Insert Quick Reference block after line 2**

Insert after the `**Model: claude-sonnet-4-6**...` line, before `## Org Structure`:

```markdown

## Quick Reference
**Produces:** `tpm-logs.md` · `brief.md` · `instructions/<role>-<phase>.md` · `brocode.md` · `adrs/`
**Key decisions to log:** Every D-NNN — one block per choice, real options table, Rationale + Downstream impact + Revisit if
**Flow paths:**
- Investigate → Pre-flight → Phase 1 (Tech Lead triage) → Phase 2 (Engineering BR loop) → Post-Run
- Spec → Pre-flight → Phase 1 (Product Track) → Phase 2 (Engineering Track) → Post-Run
- Subcommands → Step 0 only, then Stop
**Read in full when:** First run in a session · revise mode · escalation · BR round > 3
```

- [ ] **Step 3: Add thread summarization rule to the Coordination Protocol — On BR CHALLENGE block**

Find the `### On BR CHALLENGE` section in the Coordination Protocol. Append after the existing block:

```markdown

**Thread Summarization (fires after every BR round):**
After logging the CHALLENGE entry, check all thread files touched in this round:
- For each `.brocode/<id>/threads/<topic>.md` that is > 50 lines:
  1. Read the thread in full
  2. Insert a `## Summary (as of Round N)` block immediately after the thread header, before the first entry:
     - 5–8 bullet points: key positions stated, blockers raised, decisions made, open questions
     - Tag with: `<!-- summarized by TPM after BR round N -->`
  3. Preserve all thread content below the summary — never delete
- On next dispatch, instruction file tells the agent: "Read threads/<topic>.md Summary section only unless you need full context for a revision."
```

- [ ] **Step 4: Add wiki compaction step to Post-Run section**

Find the Post-Run section (search for `After writing \`brocode.md\`, run ADR extraction`). After the ADR extraction block (the block ending with `Full extraction rules: see "ADR Extraction Procedure" in commands/brocode.md`), append:

```markdown

**Wiki Compaction (fires after ADR extraction):**
After writing ADRs, check each `~/.brocode/wiki/<repo-slug>/` directory:
1. Count total lines in `overview.md` + `patterns.md` + `conventions.md` combined
2. If combined > 300 lines:
   a. Read all three files
   b. Write compacted versions in place, keeping:
      - Stack: language, framework, key deps + versions
      - Key architectural patterns: monorepo/single-service, service boundaries
      - Naming conventions: file naming, function naming, module naming
      - Test runner + test file location pattern
      - Any line tagged `<!-- keep -->` — never remove these
   c. Drop: verbose examples, redundant sections, entries with `updated_at` > 30 days ago
   d. Append `<!-- compacted by TPM YYYY-MM-DD, N lines removed -->` at top of overview.md
3. Update `~/.brocode/wiki/log.md`: append `[date] TPM compacted <repo-slug> (N→M lines)`
4. Print: `📦 TPM → wiki compacted: <repo-slug> (N→M lines)`

Never compact `test-strategy.md` or `dependencies.md`.
Skip if wiki dir doesn't exist or combined lines ≤ 300.
```

- [ ] **Step 5: Add TodoWrite calls to Coordination Protocol dispatch blocks**

Find `### On DISPATCH` in the Coordination Protocol. Append to the existing block:

```markdown
TodoWrite: mark the dispatched agent's todo item as `in_progress`
  - Item content format: `[emoji] [Agent] → [artifact they're producing]`
  - Example: `🎯 PM → product-spec.md`
```

Find `### On ARTIFACT produced`. Append:

```markdown
TodoWrite: mark the agent's todo item as `completed`
```

Find `### On APPROVE`. Append:

```markdown
TodoWrite: mark the BR review todo item as `completed`
  If this approval opens the next stage, add the next stage's todo item as `pending`
```

Find `### On COMPLETE`. Append:

```markdown
TodoWrite: mark all remaining todo items as `completed`
  Final todo list should show all items checked — this is what the user sees at run end
```

- [ ] **Step 6: Add initial TodoWrite call to each flow's Pre-flight section**

After the `### Pre-flight` header in the INVESTIGATE flow, find the step that prints run start. Append after that print line:

```markdown
TodoWrite: initialize run todo list with all INVESTIGATE flow items as `pending`:
  - `📋 TPM → brief.md written`
  - `🤝 Tech Lead → triage + clarifying questions`
  - `🤝 Tech Lead → dispatching team`
  - `⚙️ Engineers → parallel investigation (Backend / Frontend / Mobile / SRE / QA)`
  - `🤝 Tech Lead → synthesizing investigation.md`
  - `⚖️ Engineering BR → review (rounds as needed)`
  - `🤝 Tech Lead → engineering-spec.md + tasks.md`
  - `⚖️ Engineering BR → final check`
  - `📋 TPM → ADR extraction + brocode.md`
```

After the `### Pre-flight` header in the SPEC flow, append after its print line:

```markdown
TodoWrite: initialize run todo list with all SPEC flow items as `pending`:
  - `📋 TPM → brief.md written`
  - `🎯 PM → product-spec.md`
  - `🎨 Designer → ux.md`
  - `🔬 Product BR → review (rounds as needed)`
  - `🔓 Product gate → engineering track unlocked`
  - `🤝 Tech Lead → reviewing product artifacts`
  - `🤝 Tech Lead → dispatching team`
  - `⚙️ Engineers → parallel investigation (Backend / Frontend / Mobile / SRE / QA)`
  - `🤝 Tech Lead → implementation-options.md`
  - `⚖️ Engineering BR → review (rounds as needed)`
  - `🤝 Tech Lead → engineering-spec.md + tasks.md`
  - `⚖️ Engineering BR → final check`
  - `📋 TPM → ADR extraction + brocode.md`
```

- [ ] **Step 7: Verify all insertions**

Run: `grep -n "Quick Reference\|Thread Summarization\|Wiki Compaction\|TodoWrite" agents/tpm.md`
Expected: Quick Reference near line 3; Thread Summarization in Coordination Protocol; Wiki Compaction in Post-Run; TodoWrite in On DISPATCH, On ARTIFACT, On APPROVE, On COMPLETE, and Pre-flight sections

- [ ] **Step 8: Commit**

```bash
git add agents/tpm.md
git commit -m "feat: add QR header, thread summarization, wiki compaction, TodoWrite tracking to tpm.md"
```

---

### Task 4: TodoWrite calls — commands/brocode.md flows

**Files:**
- Modify: `commands/brocode.md` — add TodoWrite initialization to INVESTIGATE Pre-flight and SPEC Pre-flight; add "read Summary only" rule to instruction file format description

**Verification:** `grep -n "TodoWrite\|Summary section only" commands/brocode.md` → matches in Pre-flight sections and instruction format block

- [ ] **Step 1: Confirm Task 1 is committed**

Run: `git log --oneline -3`
Expected: Task 1 commit visible ("feat: add Quick Reference header + scoped instruction file rules")

- [ ] **Step 2: Add "read Summary only" rule to the instruction file protocol block**

Find the instruction file protocol template in the INVESTIGATE flow (search for `# Instruction: <role> — <phase>`). The template block has these fields: `Run ID`, `Your agent file`, `What to do`, `Files to read`, `File to write`, `Threads`, `Constraints`.

Append a new field after `Threads`:

```
Thread reading rule: For any thread file > 50 lines, read the `## Summary` section only
  unless you are doing a revision or the Summary says "open question: [your domain]".
  Full thread content preserved below summary for audit.
```

- [ ] **Step 3: Add TodoWrite initialization to INVESTIGATE Pre-flight**

Find the INVESTIGATE flow Pre-flight section (search for `### Pre-flight` in Step 2). After step 5 (the TPM logs block), append:

```markdown
6. TodoWrite: initialize run todo list — all items `pending`:
   ```
   📋 TPM → brief.md written            [completed immediately]
   🤝 Tech Lead → triage                [pending]
   🤝 Tech Lead → dispatching team      [pending]
   ⚙️ Engineers → parallel investigation [pending]
   🤝 Tech Lead → investigation.md      [pending]
   ⚖️ Engineering BR → review           [pending]
   🤝 Tech Lead → final spec + tasks    [pending]
   ⚖️ Engineering BR → final check      [pending]
   📋 TPM → ADR extraction + brocode.md [pending]
   ```
   Mark `📋 TPM → brief.md written` as `completed` immediately after writing brief.md.
```

- [ ] **Step 4: Add TodoWrite initialization to SPEC Pre-flight**

Find the SPEC flow Pre-flight section (search for `### Pre-flight` in Step 3). After its step 6 (the TPM logs block), append:

```markdown
7. TodoWrite: initialize run todo list — all items `pending`:
   ```
   📋 TPM → brief.md written             [completed immediately]
   🎯 PM → product-spec.md               [pending]
   🎨 Designer → ux.md                   [pending]
   🔬 Product BR → review                [pending]
   🔓 Product gate → engineering unlocked [pending]
   🤝 Tech Lead → reviewing product artifacts [pending]
   🤝 Tech Lead → dispatching team       [pending]
   ⚙️ Engineers → parallel investigation  [pending]
   🤝 Tech Lead → implementation-options.md [pending]
   ⚖️ Engineering BR → review            [pending]
   🤝 Tech Lead → final spec + tasks     [pending]
   ⚖️ Engineering BR → final check       [pending]
   📋 TPM → ADR extraction + brocode.md  [pending]
   ```
   Mark `📋 TPM → brief.md written` as `completed` immediately after writing brief.md.
```

- [ ] **Step 5: Verify**

Run: `grep -n "TodoWrite\|Thread reading rule\|Summary section only" commands/brocode.md`
Expected: Thread reading rule in instruction format block; TodoWrite in both Pre-flight sections

- [ ] **Step 6: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: add TodoWrite flow tracking + thread Summary-only rule to commands/brocode.md"
```

---

## Self-Review

**Spec coverage:**
- Mechanism 1 (compressed instruction files): Tasks 1 covers scoped include rules for PM, Designer, Tech Lead, SRE, QA, Engineering BR ✓
- Mechanism 2 (Quick Reference headers): Task 1 covers `commands/brocode.md`, Task 2 covers `tech-lead.md`, Task 3 covers `tpm.md` ✓
- Mechanism 3 (thread summarization): Task 3 (tpm.md Coordination Protocol + Thread reading rule in Task 4) ✓
- Mechanism 4 (wiki compaction): Task 3 (tpm.md Post-Run section) ✓
- Mechanism 5 (TodoWrite tracking): Task 3 (tpm.md) + Task 4 (commands/brocode.md) ✓

**Placeholder scan:** No TBDs, no TODOs. All code blocks show exact text to insert. All grep commands show exact patterns. ✓

**Type consistency:** "Thread Summarization", "Wiki Compaction", "TodoWrite" terms used consistently across tasks. ✓

**Sequencing:**
- Task 1 and Task 2 are independent (different files) → parallel
- Task 3 is independent of Tasks 1 and 2 (different file) → parallel with both
- Task 4 extends Task 1's work on `commands/brocode.md` → must be sequential after Task 1

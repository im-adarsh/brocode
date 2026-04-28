# ADR Auto-Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically extract D-NNN decisions from tpm-logs.md into standalone ADR files at run completion, plus an on-demand `/brocode export-adrs` subcommand for re-running on existing runs.

**Architecture:** TPM performs extraction inline — no sub-agent needed. Two insertion points in `commands/brocode.md` (INVESTIGATE end + SPEC end) plus one in `agents/tpm.md` Post-Run section. New `templates/adr.md` defines the ADR format. New `export-adrs` subcommand in Step 0 handles on-demand re-export.

**Tech Stack:** Markdown prose (brocode is a markdown-first agent system — no code runtime, all logic lives in agent instruction files read by Claude).

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `templates/adr.md` | Create | ADR template with YAML frontmatter — canonical format |
| `commands/brocode.md` | Modify | Add `export-adrs` subcommand to Step 0 |
| `commands/brocode.md` | Modify | Add ADR export step at end of INVESTIGATE flow (line ~341) |
| `commands/brocode.md` | Modify | Add ADR export step at end of SPEC flow (line ~629) |
| `agents/tpm.md` | Modify | Add ADR export instructions to Post-Run section (line ~112) |

---

## Task 1: Create `templates/adr.md`

**Files:**
- Create: `templates/adr.md`

This is the canonical ADR format. Agents read this to know what to write. YAML frontmatter makes it machine-readable. Body maps 1:1 to D-NNN block fields — no invented content.

- [ ] **Step 1: Write `templates/adr.md`**

```markdown
---
template: adr
artifact: .brocode/<id>/adrs/ADR-NNN-<slug>.md
producer: TPM
mode: spec_or_investigate
version_field: false
status_values: [Accepted, Superseded, Deprecated]
ai_instructions: >
  Extract fields directly from the D-NNN block in tpm-logs.md.
  Do not invent or infer content beyond what is in the source block.
  Slug: decision title lowercased, spaces to hyphens, max 6 words, strip non-alphanumeric.
  If a field is missing from the D-NNN block, use the fallback value specified per field.
  Write one ADR file per D-NNN block. Never merge two D-NNN blocks into one ADR.
---

# ADR-[NNN]: [Decision title — exact title from D-NNN block]

---
adr-id: ADR-[NNN]
spec-id: [run id — e.g. spec-20260429-oauth]
status: Accepted
date: [YYYY-MM-DD — date from D-NNN timestamp]
deciders: [agent from D-NNN header — PM | Tech Lead | TPM | User | Designer | SRE | QA]
---

## Context
[From D-NNN "Rationale" field. Expand to 2–3 sentences describing the situation that forced this choice. If Rationale field is missing, write: "Context not recorded."]

## Decision
[From D-NNN "Chose:" line. One clear sentence: "We chose [option] because [one-line reason]." If missing, write: "Decision not recorded."]

## Options Considered
[From D-NNN options table. Preserve all rows. Mark chosen option with **Chosen**.]

| Option | Description | Outcome |
|--------|-------------|---------|
| [A] | [description] | Rejected — [reason] |
| [B] | [description] | **Chosen** |

[If no options table in D-NNN block, write: "Options not recorded."]

## Consequences
[From D-NNN "Downstream impact" field. What changes as a result of this decision — which agents, artifacts, or systems are affected. If missing, write: "Consequences not recorded."]

## Revisit If
[From D-NNN "Revisit if" field — exact condition. If missing, write: "Not specified."]
```

- [ ] **Step 2: Verify file exists**

```bash
ls templates/adr.md
```

Expected: file present.

- [ ] **Step 3: Commit**

```bash
git add templates/adr.md
git commit -m "feat: add ADR template with YAML frontmatter"
```

---

## Task 2: Add `export-adrs` subcommand to `commands/brocode.md`

**Files:**
- Modify: `commands/brocode.md` — insert after line 146 (after the `review` subcommand block, before `---`)

The new subcommand block follows the exact same structure as `repos`, `develop`, and `review` — trigger phrases, flow steps, `Stop.` at end.

- [ ] **Step 1: Read the file to confirm insertion point**

```bash
grep -n "^### \`review\`\|^- Stop\.\|^---$" commands/brocode.md | head -20
```

Expected: see `### \`review\`` around line 122, `- Stop.` around line 146, `---` around line 148. Insertion is between `- Stop.` (line 146) and `---` (line 148).

- [ ] **Step 2: Insert `export-adrs` subcommand block**

In `commands/brocode.md`, find this exact text:
```
- Print: `✅ Tech Lead → review posted — <N> inline comments on <url>`
- Stop.

---
```

Replace with:
```
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
```

- [ ] **Step 3: Verify insertion**

```bash
grep -n "export-adrs\|export adrs\|generate adrs" commands/brocode.md
```

Expected: 3 matches — the subcommand header and the two trigger phrases.

- [ ] **Step 4: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: add /brocode export-adrs subcommand"
```

---

## Task 3: Add ADR Extraction Procedure section to `commands/brocode.md`

**Files:**
- Modify: `commands/brocode.md` — append new section before `## Context Awareness` (currently last section)

This section defines the extraction logic referenced by both the subcommand (Task 2) and the auto-export hooks (Tasks 4 and 5). Single definition, referenced in three places — DRY.

- [ ] **Step 1: Find insertion point**

```bash
grep -n "^## Context Awareness" commands/brocode.md
```

Expected: one match near end of file (around line 665).

- [ ] **Step 2: Insert ADR Extraction Procedure before `## Context Awareness`**

Find this exact text in `commands/brocode.md`:
```
## Context Awareness
```

Replace with:
```
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
   - Missing "Revisit if" field → write `Not specified.`
   - Missing options table → write `Options not recorded.`
   - Missing Rationale → write `Context not recorded.`
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

---

## Context Awareness
```

- [ ] **Step 3: Verify insertion**

```bash
grep -n "ADR Extraction Procedure\|## Context Awareness" commands/brocode.md
```

Expected: both headings present, `ADR Extraction Procedure` appears before `Context Awareness`.

- [ ] **Step 4: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: add ADR extraction procedure to brocode command"
```

---

## Task 4: Add auto-export hook at end of INVESTIGATE flow

**Files:**
- Modify: `commands/brocode.md` — insert ADR export step before `E-NNN · COMPLETE · TPM` in INVESTIGATE flow

- [ ] **Step 1: Find the exact anchor in INVESTIGATE flow**

```bash
grep -n "E-NNN · COMPLETE · TPM" commands/brocode.md
```

Expected: two matches — one in INVESTIGATE flow (~line 341), one in SPEC flow (~line 629). INVESTIGATE is the first occurrence.

- [ ] **Step 2: Read context around INVESTIGATE COMPLETE line**

```bash
sed -n '336,345p' commands/brocode.md
```

Expected output (approximately):
```
Engineering BR does final check on `engineering-spec.md` + `tasks.md` (max 2 rounds).
TPM logs for final BR check: `E-NNN · DISPATCH · Engineering BR` + `E-NNN · APPROVE · Engineering BR` per artifact
Print: `✅ Eng BR → engineering-spec.md APPROVED`
TPM logs: `E-NNN · COMPLETE · TPM` — run complete, list all produced artifacts + decision index (all D-NNN refs)
```

- [ ] **Step 3: Insert ADR export step before INVESTIGATE COMPLETE**

In `commands/brocode.md`, find this exact text (INVESTIGATE flow — first occurrence):
```
Print: `✅ Eng BR → engineering-spec.md APPROVED`
TPM logs: `E-NNN · COMPLETE · TPM` — run complete, list all produced artifacts + decision index (all D-NNN refs)

### Iron laws
1. No fix proposed without confirmed root cause
```

Replace with:
```
Print: `✅ Eng BR → engineering-spec.md APPROVED`
Run ADR extraction (see ADR Extraction Procedure above).
Print: `📋 TPM → [N] ADRs written to .brocode/<id>/adrs/`
TPM logs: `E-NNN · ARTIFACT · TPM` — adrs/ written, N decisions exported
TPM logs: `E-NNN · COMPLETE · TPM` — run complete, list all produced artifacts + decision index (all D-NNN refs)

### Iron laws
1. No fix proposed without confirmed root cause
```

- [ ] **Step 4: Verify**

```bash
grep -n "ADRs written\|adrs/ written" commands/brocode.md
```

Expected: 2 matches (one per flow — after this task only 1 exists, after Task 5 both present).

- [ ] **Step 5: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: auto-export ADRs at end of investigate flow"
```

---

## Task 5: Add auto-export hook at end of SPEC flow

**Files:**
- Modify: `commands/brocode.md` — insert ADR export step before `E-NNN · COMPLETE · TPM` in SPEC flow

- [ ] **Step 1: Find SPEC flow COMPLETE line**

```bash
grep -n "E-NNN · COMPLETE · TPM" commands/brocode.md
```

Expected: two matches. The second match is in the SPEC flow. Note that after Task 4 the first occurrence already has the ADR lines before it — the second occurrence still needs them.

- [ ] **Step 2: Read context around SPEC COMPLETE line**

```bash
grep -n "COMPLETE\|engineering-spec.md APPROVED\|Iron laws" commands/brocode.md
```

Use this to confirm the exact second COMPLETE block location.

- [ ] **Step 3: Insert ADR export step before SPEC COMPLETE**

In `commands/brocode.md`, find this exact text (SPEC flow — second occurrence of the pattern):
```
Print after approval: `✅ Eng BR → engineering-spec.md + tasks.md APPROVED`
TPM logs: `E-NNN · COMPLETE · TPM` — run complete, list all produced artifacts + decision index (all D-NNN refs)

### Iron laws
1. Product BR must approve before engineering starts
```

Replace with:
```
Print after approval: `✅ Eng BR → engineering-spec.md + tasks.md APPROVED`
Run ADR extraction (see ADR Extraction Procedure above).
Print: `📋 TPM → [N] ADRs written to .brocode/<id>/adrs/`
TPM logs: `E-NNN · ARTIFACT · TPM` — adrs/ written, N decisions exported
TPM logs: `E-NNN · COMPLETE · TPM` — run complete, list all produced artifacts + decision index (all D-NNN refs)

### Iron laws
1. Product BR must approve before engineering starts
```

- [ ] **Step 4: Verify both hooks present**

```bash
grep -n "ADRs written\|adrs/ written" commands/brocode.md
```

Expected: exactly 3 matches — one in `export-adrs` subcommand (Task 2), one in INVESTIGATE flow (Task 4), one in SPEC flow (Task 5).

- [ ] **Step 5: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: auto-export ADRs at end of spec flow"
```

---

## Task 6: Update `agents/tpm.md` Post-Run section

**Files:**
- Modify: `agents/tpm.md` — add ADR export step after `Print: '📊 TPM → writing brocode.md retrospective'`

This ensures TPM agents always know to run ADR export after writing the retrospective, regardless of which mode triggered.

- [ ] **Step 1: Find exact anchor in tpm.md**

```bash
grep -n "retrospective\|📊 TPM" agents/tpm.md
```

Expected: `Print: \`📊 TPM → writing brocode.md retrospective\`` around line 112.

- [ ] **Step 2: Read context**

```bash
sed -n '110,118p' agents/tpm.md
```

Expected (approximately):
```
Print: `📊 TPM → writing brocode.md retrospective`

---

## Terminal Progress Display
```

- [ ] **Step 3: Insert ADR export step**

In `agents/tpm.md`, find this exact text:
```
Print: `📊 TPM → writing brocode.md retrospective`

---

## Terminal Progress Display
```

Replace with:
```
Print: `📊 TPM → writing brocode.md retrospective`

After writing `brocode.md`, run ADR extraction:
- Read `tpm-logs.md` — find all `### [D-NNN]` blocks
- Write one `.brocode/<id>/adrs/ADR-NNN-<slug>.md` per block using `templates/adr.md`
- Write `.brocode/<id>/adrs/index.md` — table of all ADRs
- Print: `📋 TPM → [N] ADRs written to .brocode/<id>/adrs/`
- Log: `E-NNN · ARTIFACT · TPM` — adrs/ written, N decisions exported

Full extraction rules: see "ADR Extraction Procedure" in `commands/brocode.md`.

---

## Terminal Progress Display
```

- [ ] **Step 4: Verify**

```bash
grep -n "ADR extraction\|adrs/\|ADR Extraction" agents/tpm.md
```

Expected: 3–4 matches within the Post-Run section.

- [ ] **Step 5: Commit**

```bash
git add agents/tpm.md
git commit -m "feat: add ADR export step to TPM post-run section"
```

---

## Task 7: Update `templates/README.md` index

**Files:**
- Modify: `templates/README.md` — add `adr.md` to the template index table

- [ ] **Step 1: Read current index table**

```bash
grep -n "BR Approval\|br-approval\|Template Index" templates/README.md
```

Expected: BR Approval row near bottom of the Template Index table.

- [ ] **Step 2: Add ADR row to index**

In `templates/README.md`, find this exact text:
```
| BR Approval | [br-approval.md](br-approval.md) | Product BR, Engineering BR |
```

Replace with:
```
| BR Approval | [br-approval.md](br-approval.md) | Product BR, Engineering BR |
| Architecture Decision Record | [adr.md](adr.md) | TPM (auto-generated at run end) |
```

- [ ] **Step 3: Verify**

```bash
grep -n "adr\|ADR" templates/README.md
```

Expected: 2 matches — table row and the adr.md link.

- [ ] **Step 4: Commit**

```bash
git add templates/README.md
git commit -m "docs: add ADR template to templates index"
```

---

## Self-Review

**Spec coverage check:**
- ✅ ADR file format → Task 1 (templates/adr.md)
- ✅ ADR index → Task 3 (ADR Extraction Procedure step 8)
- ✅ Auto-export at INVESTIGATE end → Task 4
- ✅ Auto-export at SPEC end → Task 5
- ✅ `/brocode export-adrs` subcommand → Task 2
- ✅ Extraction logic with all edge cases → Task 3
- ✅ TPM Post-Run section updated → Task 6
- ✅ templates/README.md updated → Task 7

**Dependency order:**
- Task 1 (template) must come before Task 6 (tpm.md references it)
- Task 3 (extraction procedure) must come before Tasks 4 and 5 (they reference it)
- Tasks 2, 4, 5, 6, 7 are otherwise independent after their prerequisites

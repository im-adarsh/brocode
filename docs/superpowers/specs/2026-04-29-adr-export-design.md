# ADR Auto-Export Design

**Goal:** Automatically extract D-NNN decisions from tpm-logs.md into standalone ADR files at run completion, plus an on-demand `/brocode export-adrs` subcommand for existing runs.

**Architecture:** TPM does extraction inline — no sub-agent. Reads tpm-logs.md, parses D-NNN blocks, writes one ADR file per decision. Fires at end of every run (both modes) and on-demand via subcommand.

**Tech Stack:** Markdown parsing by TPM (regex on `### [D-NNN]` blocks), YAML frontmatter on ADR files, same pattern as templates/.

---

## ADR File Format

Location: `.brocode/<id>/adrs/ADR-NNN-<slug>.md`

Slug: decision title lowercased, spaces→hyphens, max 6 words, non-alphanumeric stripped.

```markdown
---
adr-id: ADR-NNN
spec-id: [id]
status: Accepted
date: YYYY-MM-DD
deciders: [agent — PM | Tech Lead | TPM | User | Designer]
---

# ADR-NNN: [Decision title]

## Context
[Situation that forced this choice — from D-NNN Rationale field, expanded to 2-3 sentences.]

## Decision
[What was decided — the "Chose: X" line expanded to one clear sentence.]

## Options Considered
| Option | Description | Outcome |
|--------|-------------|---------|
| A | [description] | Rejected — [reason] |
| B | [description] | **Chosen** |

## Consequences
[Downstream impact — from D-NNN "Downstream impact" field.]

## Revisit If
[Exact condition from D-NNN "Revisit if" field.]
```

Fields map 1:1 from D-NNN block — no inference beyond slug generation and date stamping.

---

## ADR Index

Location: `.brocode/<id>/adrs/index.md`

```markdown
# ADR Index — [spec-id]
Generated: YYYY-MM-DD

| ADR | Title | Decider | Downstream impact |
|-----|-------|---------|------------------|
| [ADR-001](ADR-001-<slug>.md) | [title] | PM | [one line] |
| [ADR-002](ADR-002-<slug>.md) | [title] | Tech Lead | [one line] |
```

---

## Trigger Points

### 1. Auto-export at run end (both modes)

Fires after `brocode.md` retrospective is written, before `E-NNN · COMPLETE · TPM`.

**In INVESTIGATE flow** — add after "Print: `📊 TPM → writing brocode.md retrospective`":
```
TPM extracts all D-NNN blocks from tpm-logs.md.
Creates .brocode/<id>/adrs/ directory.
Writes one ADR-NNN-<slug>.md per D-NNN block.
Writes .brocode/<id>/adrs/index.md.
Print: `📋 TPM → [N] ADRs written to .brocode/<id>/adrs/`
TPM logs: `E-NNN · ARTIFACT · TPM` — adrs/ written, N decisions exported
```

**In SPEC flow** — same, same location.

### 2. `/brocode export-adrs` subcommand (on-demand)

Added to Step 0 subcommand block in `commands/brocode.md`.

Trigger: input is `export-adrs` or contains "export adrs" / "generate adrs" / "export decisions".

Flow:
1. If `[id]` provided in input: use `.brocode/<id>/tpm-logs.md`
2. If no id: scan `.brocode/` for dirs containing `tpm-logs.md`. If one found, use it. If multiple, list and ask which.
3. Run extraction (same logic as auto-export).
4. Overwrites existing `.brocode/<id>/adrs/` — idempotent.
5. Print: `📋 TPM → [N] ADRs written to .brocode/<id>/adrs/`
6. Stop.

---

## Extraction Logic (TPM inline)

TPM performs these steps without dispatching a sub-agent:

1. Read `.brocode/<id>/tpm-logs.md` in full
2. Split on `### [D-` to find all decision blocks
3. For each block, parse:
   - **ID**: `D-NNN` number → becomes `ADR-NNN`
   - **Timestamp + agent**: `HH:MM · DECISION · [Agent]`
   - **Title**: bold line immediately after the header
   - **Options table**: the markdown table rows
   - **Chose line**: `**Chose:** X — [name]`
   - **Rationale**: paragraph after `**Rationale:**`
   - **Downstream impact**: paragraph after `**Downstream impact:**`
   - **Revisit if**: paragraph after `**Revisit if:**`
4. Generate slug from title
5. Write ADR file using template
6. After all ADRs written, write index.md

Edge cases:
- D-NNN block missing "Revisit if" field → write `Revisit if: Not specified`
- D-NNN block missing options table → write `Options Considered: Not recorded`
- Malformed block (truncated run) → skip, log warning in index.md as `⚠️ ADR-NNN: incomplete block, skipped`
- Zero D-NNN blocks found → write index.md with note "No decisions recorded in this run"

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `commands/brocode.md` | Modify | Add `export-adrs` to Step 0 subcommands |
| `commands/brocode.md` | Modify | Add ADR export step at end of INVESTIGATE flow |
| `commands/brocode.md` | Modify | Add ADR export step at end of SPEC flow |
| `agents/tpm.md` | Modify | Add ADR export to Post-Run section after brocode.md |
| `templates/adr.md` | Create | New ADR template with YAML frontmatter |

No new agent files. No new dependencies. TPM does all extraction inline.

---

## What Is Not In Scope

- Pushing ADRs to GitHub/Confluence/Notion
- Linking ADRs back to product-spec.md or engineering-spec.md
- ADR status transitions (Accepted → Superseded)
- Cross-run ADR deduplication

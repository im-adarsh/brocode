# Shared: Final Spec Postlude
<!-- Referenced by spec.md and investigate.md after all artifacts BR-approved. -->

Print: `📦 TPM → compacting context before final spec`
Run: `/compact`

## Step P1: Tech Lead writes final spec

TPM writes `.brocode/<id>/instructions/tech-lead-final-spec.md`:
```
# Instruction: Tech Lead — write final spec
Run ID: <id>
Your agent file: agents/tech-lead.md
What to do: Read all approved artifacts. Write engineering-spec.md (RFC format,
  fully self-contained — context, decision, consequences, implementation plan).
  Write tasks.md (domain-scoped task list, clear ACs per task).
Files to read:
  Spec mode → product-spec.md, implementation-options.md, ops.md, test-cases.md, all br/engineering/*-approved.md
  Investigate mode → investigation.md, ops.md, test-cases.md, all br/engineering/*-approved.md
Files to write: .brocode/<id>/engineering-spec.md, .brocode/<id>/tasks.md
Constraints: Sole producer. Engineering BR final-checks after. Self-contained RFC.
  Output templates: agents/_includes/tech-lead/templates.md
```

Print: `🤝 Tech Lead → writing engineering-spec.md + tasks.md`
TPM logs: `E-NNN · DISPATCH · Tech Lead` — writing final spec
Dispatch Tech Lead sub-agent (fresh context).
TPM logs:
- `E-NNN · ARTIFACT · Tech Lead` — engineering-spec.md v1 written
- `E-NNN · ARTIFACT · Tech Lead` — tasks.md v1 written, N tasks across N domains

## Step P2: Engineering BR final check

Engineering BR final check on `engineering-spec.md` + `tasks.md` (max `<final_check_rounds>` rounds — see `_shared/br-loop.md`).
Print after approval: `✅ Eng BR → engineering-spec.md + tasks.md APPROVED`

## Step P3: Investigate-mode evidence.md (skip in spec mode)

If investigate mode, Tech Lead writes `.brocode/<id>/evidence.md` per `templates/evidence.md`:
- Reproduction steps + reproducibility
- Verbatim logs / stack traces
- Timeline table
- Hypotheses ruled out

TPM logs: `E-NNN · ARTIFACT · Tech Lead` — evidence.md written

## Step P4: Retrospective + ADRs + decisions.md

Print: `📊 TPM → writing brocode.md retrospective`
Write `.brocode/<id>/brocode.md` per `templates/retrospective.md`.

Run ADR extraction:
- Read `tpm-logs.md`, find all `### [D-NNN]` blocks
- Write `.brocode/<id>/adrs/ADR-NNN-<slug>.md` per block using `templates/adr.md`
- Write `.brocode/<id>/adrs/index.md` — table of all ADRs
- Print: `📋 TPM → [N] ADRs written to .brocode/<id>/adrs/`
- Log: `E-NNN · ARTIFACT · TPM` — adrs/ written, N decisions exported

Write `.brocode/<id>/decisions.md` (extracted from tpm-logs.md):
```markdown
# Decision Log
**Run ID:** [id]

[All D-NNN blocks from tpm-logs.md — copy each block in full]
```
TPM logs: `E-NNN · ARTIFACT · TPM` — decisions.md written, N decisions extracted

## Step P5: Wiki compaction

For each subdirectory under `~/.brocode/wiki/`:
1. Sum lines in `overview.md` + `patterns.md` + `conventions.md`
2. If combined > 300 lines:
   - Read all three
   - Write compacted versions in place, keeping: stack, key architectural patterns, naming conventions, test runner+location, lines tagged `<!-- keep -->`
   - Drop: verbose examples, redundant sections, entries with `updated_at` > 30 days
   - Append `<!-- compacted by TPM YYYY-MM-DD, N lines removed -->` at top of overview.md
3. Update `~/.brocode/wiki/log.md`: `[date] TPM compacted <repo-slug> (N→M lines)`
4. Print: `📦 TPM → wiki compacted: <repo-slug> (N→M lines)`

Never compact `test-strategy.md` or `dependencies.md`.
Skip if wiki dir missing or combined ≤ 300.

## Step P6: COMPLETE

TPM logs: `E-NNN · COMPLETE · TPM` — total duration, list all produced artifacts, decision index (D-NNN refs), Performance Summary table per `templates/tpm-logs.md`.

Print: `✅ TPM → done — N min total, [N] decisions logged`

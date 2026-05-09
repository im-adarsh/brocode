# Template: tpm-logs.md
<!-- Read by TPM only when initializing or writing the COMPLETE block. -->
<!-- Entry-format authority lives in skills/brocode/modes/_shared/log-format.md. -->

## File header

```markdown
# TPM Run Log
**ID:** [id]
**Mode:** INVESTIGATE | SPEC
**Started:** YYYY-MM-DD HH:MM
**Status:** IN_PROGRESS | BLOCKED | COMPLETE

---

## Stage Progress
| Stage | Agent(s) | Status | Started | Duration | Revisions | Notes |
|-------|----------|--------|---------|----------|-----------|-------|
| Input ingestion | TPM | ✅ DONE | HH:MM | N min | — | |
| brief.md | TPM | ⏳ PENDING | — | — | — | |
| product-spec.md | PM | ⏳ PENDING | — | — | — | |
| Product BR gate | Product BR | ⏳ PENDING | — | — | — | |
| implementation-options.md | Tech Lead | ⏳ PENDING | — | — | — | |
| ops.md | SRE | ⏳ PENDING | — | — | — | |
| test-cases.md | QA | ⏳ PENDING | — | — | — | |
| Engineering BR reviews | Eng BR | ⏳ PENDING | — | — | — | |
| engineering-spec.md | Tech Lead | ⏳ PENDING | — | — | — | |

Status legend: ⏳ PENDING · 🔄 IN_PROGRESS · 🚫 BLOCKED · ✅ DONE · 🟡 ESCALATED
Duration = dispatched → artifact approved (includes revision rounds)
Revisions = BR challenge rounds the agent went through

---

## Reviewer Revision Requests
[Human reviewer: add a row here to reopen a decision or challenge an outcome.
TPM picks it up on next run and reopens from that entry.]

| Ref | What to revisit | Status |
|-----|----------------|--------|
| — | — | — |

---

## Run Log

[Append E-NNN and D-NNN entries here per skills/brocode/modes/_shared/log-format.md]
```

## COMPLETE block (write at end of run)

```markdown
### [E-NNN] HH:MM · COMPLETE · TPM
Run complete. **Total duration:** N min (started HH:MM → completed HH:MM)

**Produced:**
- engineering-spec.md
- tasks.md
- adrs/ — N ADRs
- decisions.md
- conversation.md
- brocode.md

**Performance Summary:**
| Agent | Artifact | Dispatched | Done | Duration | Revisions | Revision time |
|-------|----------|-----------|------|----------|-----------|---------------|
| PM | product-spec.md | HH:MM | HH:MM | N min | N rounds | N min |
| Tech Lead | implementation-options.md | HH:MM | HH:MM | N min | N rounds | N min |
| Backend Engineer | threads/<topic>.md | HH:MM | HH:MM | N min | — | — |
| Frontend Engineer | threads/<topic>.md | HH:MM | HH:MM | N min | — | — |
| Mobile Engineer | threads/<topic>.md | HH:MM | HH:MM | N min | — | — |
| SRE | ops.md | HH:MM | HH:MM | N min | N rounds | N min |
| QA | test-cases.md | HH:MM | HH:MM | N min | N rounds | N min |
| Tech Lead | engineering-spec.md + tasks.md | HH:MM | HH:MM | N min | N rounds | N min |
| **Total run** | | **HH:MM** | **HH:MM** | **N min** | | |

Duration = dispatched → artifact approved (includes revision rounds)
Revision time = time spent responding to BR challenges (excludes drafting time)

**Decision Index:**
| Ref | Decision | Made by | Artifact |
|-----|----------|---------|---------|
| D-001 | <title> | PM | product-spec.md |
| D-002 | <title> | PM | product-spec.md v2 |
| D-003 | <title> | Tech Lead | implementation-options.md |
```

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

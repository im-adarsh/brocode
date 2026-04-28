---
template: br-approval
artifact: br/[product|engineering]/[req|ux|impl|ops|qa]-approved.md
producer: Product Bar Raiser (product track) | Engineering Bar Raiser (engineering track)
mode: spec_or_investigate
version_field: false
status_values: []
ai_instructions: >
  Use this template for all Bar Raiser approval files.
  Approval is granted only when ALL challenges from all prior rounds are resolved.
  Notes section is non-blocking — observations only, not new challenges.
  Product BR gate-approved.md is a separate file that opens the engineering track.
  File naming:
    br/product/req-approved.md
    br/product/ux-approved.md
    br/product/gate-approved.md  (product gate — written after both req and ux approved)
    br/engineering/impl-approved.md
    br/engineering/ops-approved.md
    br/engineering/qa-approved.md
---

# [Product | Engineering] Bar Raiser Approval: [PM Requirements | Design | Tech Lead | SRE | QA]

## Verdict: APPROVED

---

## Research Summary *(Product BR only — omit for Engineering BR)*
[Any competitor/market research conducted during review — for engineering track to reference]

---

## Challenges Resolved
| Challenge | Round raised | Resolution summary |
|-----------|-------------|-------------------|
| C1: [title] | R[N] | [one sentence: what was added/changed] |
| C2: [title] | R[N] | [one sentence] |

---

## Notes
[Non-blocking observations — things the producer should consider but not required before approval. Do not add new challenges here.]

---

## Gate Status *(Product BR only — for req-approved.md and ux-approved.md)*
[Track status — update once both artifacts approved:]
- Requirements: APPROVED
- Design: APPROVED | PENDING

*(For gate-approved.md only):*
Product track APPROVED. Engineering track may proceed.

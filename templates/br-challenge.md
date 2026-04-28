---
template: br-challenge
artifact: br/[product|engineering]/[req|ux|impl|ops|qa]-challenge-r[N].md
producer: Product Bar Raiser (product track) | Engineering Bar Raiser (engineering track)
mode: spec_or_investigate
version_field: false
status_values: []
ai_instructions: >
  Use this template for all Bar Raiser challenge files.
  Every challenge must reference an exact artifact section — no vague references.
  Every challenge must state exactly what the producer must provide to resolve it.
  Cross-artifact issues must be called out explicitly with evidence from both artifacts.
  Do not challenge for style — only substance gaps that have real user/ops impact.
  Challenges are blockers, not suggestions.
  File naming: br/product/req-challenge-r1.md, br/product/ux-challenge-r1.md,
               br/engineering/impl-challenge-r1.md, br/engineering/ops-challenge-r1.md,
               br/engineering/qa-challenge-r1.md
---

# [Product | Engineering] Bar Raiser Challenge: [PM Requirements | Design | Tech Lead | SRE | QA] — Round [N]

## Verdict: CHALLENGED

---

## Web Research Conducted *(Product BR only — omit for Engineering BR)*
[If competitor/market research done: what was searched, what was found]
[Paste key findings that inform challenges]

---

## Cross-Artifact Issues Found *(Engineering BR only — omit for Product BR)*
[Inconsistencies between this artifact and others. Call them out explicitly with evidence from both sides.]

| Issue | Artifact A claim | Artifact B claim | Conflict |
|-------|-----------------|-----------------|---------|
| [issue] | [quote from impl/ops/qa] | [quote from different artifact] | [why they're inconsistent] |

---

## Challenges

### C1: [Short title]
**Artifact section:** [exact section heading — e.g., "Section 6: User Journeys, J-2, Step 3"]
**Issue:** [Precisely what is wrong, vague, missing, or inconsistent. Use a specific scenario, not an abstract gap.]
**Evidence:** *(Product BR only)* [If from research: source URL + exact finding]
**Required to resolve:** [Exactly what the producer must provide — specific content, not "address this"]

### C2: [Short title]
**Artifact section:** [exact section]
**Issue:** [precise issue with specific scenario]
**Evidence:** *(if applicable)*
**Required to resolve:** [exact deliverable]

### C3: [Short title] *(add as many as needed)*
**Artifact section:** [exact section]
**Issue:** [precise issue]
**Evidence:** *(if applicable)*
**Required to resolve:** [exact deliverable]

---

## Approval Criteria

All challenges above resolved. Respond with:
1. Revised artifact with all [bracketed] placeholders filled
2. `## Changes from BR Challenge round [N]` section appended, addressing each challenge by number (C1, C2, ...)

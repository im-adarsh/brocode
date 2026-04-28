---
template: implementation-options
artifact: implementation-options.md
producer: Tech Lead
challenger: Engineering Bar Raiser
mode: spec
version_field: true
status_values: [DRAFT, REVISED, APPROVED]
required_sections: [swe_debate_log, option_a, option_b, option_c, tech_lead_recommendation]
ai_instructions: >
  Fill every [bracketed] placeholder with real content.
  Every option must include real code sketches — not pseudocode descriptions.
  Pros/cons must be specific and measurable ("adds 200ms p99 latency" not "slower").
  Tech Lead recommendation must tie directly to requirements and approved design contract.
  SWE debate log must show real exchanges that shaped the options — not a summary.
  Append "## Changes from BR Challenge round <N>" on each revision.
---

# Implementation Options
**Spec ID:** [id]
**Version:** [N]
**Status:** DRAFT | REVISED | APPROVED
**Domains involved:** [Backend | Frontend | Mobile | Cross-domain]

---

## SWE Debate Log

[Key exchanges between Backend / Frontend / Mobile that shaped the options. Show disagreements that became explicit tradeoffs.]

```
[Backend → Tech Lead]: [position on data model / API contract]
[Frontend → Tech Lead]: [requirement that changes backend shape]
[Backend → Tech Lead]: [constraint that limits frontend approach]
[Tech Lead]: [synthesis decision]
```

---

## Option A: [Name]

### Approach
[2-3 sentences — precise. What is being built, how it works end-to-end, what the key architectural decision is.]

### Backend implementation
```[lang]
// Real code sketch — handler signature, key logic, error handling
// Not pseudocode — actual code structure an engineer would write
async function handleRequest(req: Request): Promise<Response> {
  // key steps
}
```

### Frontend implementation *(if applicable)*
```[lang]
// Real code sketch — component, hook, API call, state shape
```

### Mobile implementation *(if applicable)*
```[lang]
// Real code sketch — platform-specific concerns, payload size, offline handling
```

### Pros
- [concrete: "single DB write, no distributed transaction risk"]
- [concrete: "backward compatible — no client migration needed"]

### Cons
- [concrete: "adds 150ms to p99 for the checkout endpoint under 1k req/s"]
- [concrete: "requires index on users.tenant_id — ~4 min migration on prod table size"]

### Complexity: [Low | Medium | High]
### Risk: [Low | Medium | High]

---

## Option B: [Name]

### Approach
[2-3 sentences — precise.]

### Backend implementation
```[lang]
// Real code sketch
```

### Frontend implementation *(if applicable)*
```[lang]
// Real code sketch
```

### Mobile implementation *(if applicable)*
```[lang]
// Real code sketch
```

### Pros
- [concrete]

### Cons
- [concrete]

### Complexity: [Low | Medium | High]
### Risk: [Low | Medium | High]

---

## Option C: [Name]

### Approach
[2-3 sentences — precise.]

### Backend implementation
```[lang]
// Real code sketch
```

### Frontend implementation *(if applicable)*
```[lang]
// Real code sketch
```

### Mobile implementation *(if applicable)*
```[lang]
// Real code sketch
```

### Pros
- [concrete]

### Cons
- [concrete]

### Complexity: [Low | Medium | High]
### Risk: [Low | Medium | High]

---

## Tech Lead Recommendation

**Recommended Option:** [A | B | C]

**Backend position:** [agree / disagree + specific reason]
**Frontend position:** [agree / disagree + specific reason]
**Mobile position:** [agree / disagree + specific reason — omit if mobile not involved]
**SRE input:** [ops feasibility + blast radius concern if any]

**Rationale:** [Tied directly to product requirements and design constraints. Reference specific ACs, personas, or constraints that make this option the right choice. Explain why the other options were rejected.]

---

## Changes from BR Challenge
[Added on each revision — address each BR challenge by number C1, C2, ...]

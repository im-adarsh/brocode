---
template: product-spec
artifact: product-spec.md
producer: PM
challenger: Product Bar Raiser
mode: spec
version_field: true
status_values: [DRAFT, REVISED, APPROVED]
required_sections: [summary, problem_statement, goals, non_goals, personas, journeys, acceptance_criteria, success_metrics, scope_decisions, constraints, assumptions, dependencies, open_questions]
ai_instructions: >
  Fill every [bracketed] placeholder with real content.
  Do not leave any placeholder unfilled.
  Every AC must be testable and measurable — no "should feel" or "should be fast".
  Every persona must have a journey and ACs that reference them.
  Append "## Changes from BR Challenge round <N>" on each revision.
---

# Product RFC (pRFC): [Feature Name]
**pRFC-ID:** [spec-id]
**Author:** PM
**Version:** [N]
**Status:** DRAFT | REVISED | APPROVED
**Created:** YYYY-MM-DD

---

## Summary
[2–3 sentences: what we're building, for whom, why now. Plain language — no jargon.]

---

## 1. Problem Statement

### Current state
[What is broken or missing today. Concrete evidence: metrics, user complaints, support volume, revenue impact. If no data, state what is observable.]

### Why now
[What changed — market, usage pattern, competitive pressure, technical blocker — that makes this urgent now vs later.]

### Impact of not doing this
[Quantified where possible: % of users affected, revenue at risk, support tickets per month, NPS impact.]

---

## 2. Background
[Context a new team member needs: how this fits the existing product, what has been tried before, what constraints exist. Do not assume the reader knows the product.]

---

## 3. Goals

| ID | Goal | Metric | Target |
|----|------|--------|--------|
| G-1 | [Specific, outcome-oriented goal] | [How measured] | [Target value] |
| G-2 | ... | ... | ... |

---

## 4. Non-Goals

| Excluded scope | Why excluded | When to revisit |
|---------------|-------------|-----------------|
| [item] | [reason] | [condition] |

---

## 5. User Personas

### [Persona 1: e.g., Consumer / End User]
- **Who they are:** [Role, context, technical comfort level, usage frequency]
- **Primary goal:** [What they want to accomplish with this feature]
- **Pain today:** [What frustrates them in the current state — specific, not generic]
- **Success looks like:** [What they would say if this works well]
- **Volume:** [Approximate number of these users / % of user base]

### [Persona 2: e.g., Merchant / Partner]
- **Who they are:** [...]
- **Primary goal:** [...]
- **Pain today:** [...]
- **Success looks like:** [...]
- **Volume:** [...]

### [Persona 3: e.g., Ops / Admin]
- **Who they are:** [Who manages this feature post-launch, how they configure and monitor it]
- **Primary goal:** [...]
- **Pain today:** [...]
- **Success looks like:** [...]
- **Volume:** [...]

### [Persona 4: e.g., Support Team]
- **Who they are:** [How they triage when users complain about this feature]
- **Primary goal:** [...]
- **Pain today:** [...]
- **Success looks like:** [...]
- **Volume:** [...]

---

## 6. User Journeys

### J-1: [Journey name] — [Persona]
**Entry point:** [How the user arrives at this feature]
**Frequency:** [How often this happens]

| Step | User action | System response | Possible failure | Recovery |
|------|-------------|-----------------|-----------------|----------|
| 1 | [action] | [response] | [what can fail] | [recovery] |
| 2 | ... | ... | ... | ... |

**Exit point:** [Where the user ends up when journey completes successfully]
**Edge cases:** [Unusual but realistic variations]

### J-2: [Journey name] — [Persona]
[same structure]

### J-3: Ops Management Journey — [Ops Persona]
[How ops creates, configures, disables, monitors this feature]

### J-4: Support Triage Journey — [Support Persona]
[How support looks up user state, identifies the issue, resolves or escalates]

---

## 7. Acceptance Criteria

| AC | Persona | Criterion | Test approach | Priority |
|----|---------|-----------|---------------|----------|
| AC-1 | [persona] | [Measurable, specific, testable] | Unit / Integration / E2E | P0 |
| AC-2 | ... | ... | ... | P1 |

**P0** = launch blocker · **P1** = should have at launch · **P2** = nice to have

---

## 8. Success Metrics

| Metric | Baseline | Target | How measured | When to measure |
|--------|----------|--------|-------------|----------------|
| [metric] | [current value or N/A] | [target] | [instrumentation / query] | [T+N days post-launch] |

---

## 9. Scope Decisions

| Feature / behavior | Decision | Rationale |
|-------------------|----------|-----------|
| [item] | IN SCOPE | [why] |
| [item] | OUT OF SCOPE | [why, when to revisit] |

---

## 10. Constraints

| Constraint | Type | Impact on design |
|-----------|------|-----------------|
| [constraint] | Technical / Legal / Business / Timeline | [how it limits options] |

---

## 11. Assumptions

| Assumption | Confidence | Risk if wrong | How to validate |
|-----------|------------|---------------|----------------|
| [assumption] | High / Medium / Low | [what breaks] | [how to test] |

---

## 12. Dependencies

| Dependency | Type | Owner | Status | Risk if blocked |
|-----------|------|-------|--------|----------------|
| [dependency] | Internal / External | [team / vendor] | [status] | [impact] |

---

## 13. Open Questions

| Question | Options | Who decides | Deadline |
|---------|---------|------------|---------|
| [question] | A: [option] / B: [option] | [role] | [date] |

---

## 14. Competitor / Market Reference

| Competitor | What they do | What we're adopting | What we're doing differently |
|------------|-------------|--------------------|-----------------------------|
| [name] | [specific behavior] | [what we're taking] | [our differentiation] |

[Product BR will research and validate these]

---

## Changes from BR Challenge
[Added on each revision — address each challenge by number C1, C2, ...]

# CLAUDE.md — brocode

## What this is

brocode is a multi-agent SDLC plugin. It simulates a full engineering org — PM, Designer, SWE, Staff SWE, SRE, QA, and two specialized Bar Raisers — to investigate bugs and produce engineering specs.

Single entry point: `/brocode`

---

## Agent roster

| File | Role | Track |
|------|------|-------|
| `agents/tpm.md` | Technical Program Manager — coordinates all agents, owns run log | Cross-cutting |
| `agents/pm.md` | Product Manager | Product |
| `agents/designer.md` | Designer (API + UX) | Product |
| `agents/product-bar-raiser.md` | Principal PM / Head of Product | Product gate |
| `agents/swe.md` | SWE Team Coordinator (orchestrates sub-team debate) | Engineering |
| `agents/swe-backend.md` | Backend Engineer — APIs, DB, services, queues | Engineering |
| `agents/swe-frontend.md` | Frontend/Fullstack Engineer — web UI, state, browser | Engineering |
| `agents/swe-mobile.md` | Mobile Engineer — iOS, Android, React Native, Flutter | Engineering |
| `agents/staff-eng.md` | Staff Software Engineer | Engineering |
| `agents/sre.md` | Site Reliability Engineer | Engineering |
| `agents/qa.md` | QA Engineer | Engineering |
| `agents/engineering-bar-raiser.md` | Principal Engineer | Engineering gate |

## Skills

| File | Purpose |
|------|---------|
| `skills/using-sdlc/SKILL.md` | Orientation — loaded at session start |
| `skills/investigate/SKILL.md` | Oncall-style bug investigation flow |
| `skills/spec/SKILL.md` | Full SDLC spec flow |
| `skills/input-ingestion/SKILL.md` | External input handling (docs, images, URLs) |
| `skills/bar-raiser-loop/SKILL.md` | Adversarial challenge/response loop |

## Commands

| File | Command |
|------|---------|
| `commands/brocode.toml` | `/brocode` — single entry point |

---

## Flow summary

### Investigate mode
```
Backend + Frontend + Mobile (scoped subset, parallel) — read real codebase
    ↕ debate in swe-debate.md thread
SWE Coordinator synthesizes + SRE (parallel)
    → Staff SWE
    → Engineering BR (adversarial loop, max 2 rounds)
    → 08-final-spec.md
```

### Spec mode
```
PM → Designer (with conversation)
    → Product BR (adversarial loop, web search on competitors)
    → [GATE] engineering starts only after product approved
Backend + Frontend + Mobile (scoped subset) — read real codebase
    ↕ debate in swe-debate.md thread
SWE Coordinator synthesizes → Staff SWE (converge)
    → SRE + QA (parallel, can ask SWE questions)
    → Engineering BR (adversarial loop, cross-artifact consistency)
    → 08-final-spec.md
```

---

## Key rules for agents working here

- Edit only your own artifact file — never another agent's
- Threads are append-only — add entries, never rewrite
- Read-before-edit: always Read a file before Edit/Write on existing files
- Bar Raiser challenges are blockers, not suggestions — producers must respond
- Max 2 BR challenge rounds per artifact — then escalate to user with specific question
- No engineering track starts before Product BR gate approval (spec mode)
- No fix proposed without confirmed root cause (investigate mode)
- All artifacts versioned — increment Version N on each revision

---

## Context directory structure

```
.sdlc/<id>/
  00-tpm-log.md               ← TPM master progress log (updated throughout)
  00-brief.md
  00-input-raw.md
  01-requirements.md
  02-design.md
  03-investigation.md | 03-implementation-options.md
  04-architecture.md
  05-ops.md
  06-test-cases.md
  threads/
    product-conversation.md
    swe-debate.md               ← Backend ↔ Frontend ↔ Mobile debate
    eng-conversation.md         ← SWE team ↔ Staff SWE ↔ SRE ↔ QA
    eng-product-conversation.md ← Eng ↔ PM/Designer
  07-product-br-reviews/
  07-eng-br-reviews/
  08-final-spec.md
```

---

## Adding new agents or roles

1. Create `agents/<role>.md` following existing agent format
2. Add to this CLAUDE.md roster table
3. Update the relevant skill (investigate or spec) to dispatch the new agent
4. Update `skills/using-sdlc/SKILL.md` if it affects the visible flow

## Modifying BR challenge standards

- Product BR challenge standards: `agents/product-bar-raiser.md` → "Challenge Standards" section
- Engineering BR challenge standards: `agents/engineering-bar-raiser.md` → "What You Look For" section

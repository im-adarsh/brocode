---
name: sdlc-spec
description: Use when user wants to build a feature, design a system, or plan a change — triggers full multi-agent SDLC spec with product and engineering tracks
---

# SDLC Spec

Full SDLC simulation. Product track → Engineering track. Two Bar Raisers. Adversarial loops. Final approved spec.

## When to Use

- User wants to build a new feature
- User has a PRD, doc, image, wiki to process
- User wants to design a system change
- User wants engineering spec with options and tradeoffs

## Pre-Flight

1. Generate spec ID: `spec-YYYYMMDD-[slug]` (e.g. `spec-20260426-user-auth`)
2. Create context directory: `.sdlc/<id>/`
3. Create thread directories: `.sdlc/<id>/threads/` and `.sdlc/<id>/07-product-br-reviews/` and `.sdlc/<id>/07-eng-br-reviews/`
4. Ingest input — invoke `sdlc-input-ingestion` skill if input is external (doc, image, URL)
5. Write `00-brief.md`
6. **Dispatch TPM** (reads `agents/tpm.md`) — TPM creates `00-tpm-log.md`, initialises full stage tracker, and runs for entire spec lifecycle logging every transition, BR round, conversation summary, and blocker

## Phase 1 — Product Track

### Step 1a: PM (reads `agents/pm.md`)
- Ingest `00-brief.md` + any raw input
- Ask Designer questions via `threads/product-conversation.md` as needed
- Produce `01-requirements.md` — personas, journeys (end user + ops + support), ACs, competitor references

### Step 1b: Designer (reads `agents/designer.md`)
- Reads `01-requirements.md`
- Converses with PM via `threads/product-conversation.md`
- Produces `02-design.md` — API contracts, all user flows, ops interface, support interface

PM and Designer may converse freely. Both artifacts must be stable before Product BR reviews.

### Step 1c: Product Bar Raiser (reads `agents/product-bar-raiser.md`)
- Reviews `01-requirements.md` — challenges PM
- Reviews `02-design.md` — challenges Designer
- Uses web search for competitor references in requirements
- Writes challenges to `07-product-br-reviews/`
- PM and Designer revise, BR re-reviews
- Max 2 rounds per artifact
- On approval: writes gate approval to `07-product-br-reviews/gate-approved.md`

**Engineering track does NOT start until Product BR gate is approved.**

## Phase 2 — Engineering Track (starts after Product BR approval)

### Step 2a: SWE (reads `agents/swe.md`) — parallel with Step 2b start
- Reads `01-requirements.md` + `02-design.md`
- Asks PM/Designer questions via `threads/eng-product-conversation.md` if needed
- Converses with Staff SWE via `threads/eng-conversation.md`
- Proposes 3 implementation options with real code sketches
- Produces `03-implementation-options.md`

### Step 2b: Staff SWE (reads `agents/staff-eng.md`) — converges with SWE
- Reads `02-design.md` + `03-implementation-options.md`
- Converses with SWE via `threads/eng-conversation.md`
- Reviews options for architectural soundness
- Joint recommendation produced in `04-architecture.md`

SWE and Staff SWE must converge on a single recommendation before Phase 2c.

### Step 2c: SRE + QA (reads `agents/sre.md` + `agents/qa.md`) — parallel
- Both read approved product artifacts + `03-implementation-options.md` + `04-architecture.md`
- Both can ask SWE/Staff SWE questions via `threads/eng-conversation.md`
- SRE produces `05-ops.md` independently
- QA produces `06-test-cases.md` independently

### Step 2d: Engineering Bar Raiser (reads `agents/engineering-bar-raiser.md`)
- Reviews all four: `03`, `04`, `05`, `06`
- Checks cross-artifact consistency
- Challenges each artifact separately
- Each producer revises, BR re-reviews
- Max 2 rounds per artifact
- On all approved: writes `08-final-spec.md`

## Context File Map

```
.sdlc/<id>/
  00-tpm-log.md             ← TPM master log (live throughout)
  00-brief.md
  00-input-raw.md           ← if external input ingested
  01-requirements.md        ← PM
  02-design.md              ← Designer
  03-implementation-options.md  ← SWE
  04-architecture.md        ← Staff SWE
  05-ops.md                 ← SRE
  06-test-cases.md          ← QA
  threads/
    product-conversation.md     ← PM ↔ Designer
    eng-conversation.md         ← SWE ↔ Staff SWE ↔ SRE ↔ QA
    eng-product-conversation.md ← SWE/Staff SWE ↔ PM/Designer
  07-product-br-reviews/
    01-pm-challenge-round1.md
    01-pm-approved.md
    02-design-challenge-round1.md
    02-design-approved.md
    gate-approved.md
  07-eng-br-reviews/
    01-swe-challenge-round1.md
    01-swe-approved.md
    ...
  08-final-spec.md          ← Engineering BR approved
```

## Parallel Dispatch Rules

**Can run in parallel:**
- SRE + QA (Phase 2c) — fully independent outputs
- PM initial draft + Designer initial draft (if PM answers enough questions first)

**Must be sequential:**
- Product BR gate must close before engineering track starts
- SWE options must exist before Staff SWE can review
- All four eng artifacts must be approved before final spec is written

## Token Efficiency

- Each agent reads only its required inputs — listed explicitly in each agent file
- Threads are append-only logs — never rewritten
- Artifacts are versioned (Version N) — BR always reviews latest version
- Final spec synthesizes, does not duplicate all artifacts

## Iron Laws

1. Product BR must approve before engineering starts
2. SWE + Staff SWE must converge before SRE/QA start
3. Engineering BR must approve all 4 artifacts before final spec
4. Max 2 BR challenge rounds per artifact — then escalate to user
5. No agent edits another agent's artifact

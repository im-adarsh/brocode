---
name: using-sdlc
description: Use when user invokes /brocode — single entry point that routes to investigate or spec mode based on context
---

# SDLC Plugin — `/brocode`

Single command. Context-aware. Orchestrates the full multi-agent SDLC flow.

## Entry Point

**`/brocode [anything]`** — paste a bug description, feature idea, PRD link, image, doc URL, or just describe what you need.

The orchestrator reads context and routes automatically.

---

## Mode 1: Investigate (Bug / Incident / Oncall)

**Triggers when input describes:** bug, error, crash, incident, test failure, unexpected behavior.

**Agents involved:**
```
SWE + SRE (parallel) → Staff SWE → Engineering Bar Raiser (adversarial loop)
→ Final investigation report + approved fix + test case
```

**Key properties:**
- SWE traces root cause systematically — no guessing
- SRE assesses blast radius in parallel
- Staff SWE validates architectural implications
- Engineering BR challenges root cause claim before any fix is approved
- Max 2 BR challenge rounds, then escalates to user

---

## Mode 2: Spec (Feature / Design / System Change)

**Triggers when input describes:** feature to build, system to design, doc/PRD to process.

**Agents involved:**
```
Product Track:
  PM → Designer (with conversation) → Product Bar Raiser (adversarial loop)
  ↓ (gate — engineering does NOT start until product approved)
Engineering Track:
  SWE + Staff SWE (converge) → SRE + QA (parallel) → Engineering Bar Raiser (adversarial loop)
  → Final approved spec
```

**Key properties:**
- PM ingests any input format (text, image, Google Doc, wiki)
- PM + Designer converse to close gaps
- Product BR researches competitor references via web search
- Engineering starts only after product artifacts approved
- SWE ↔ Staff SWE converse to converge on architecture
- SRE + QA run in parallel, can ask SWE questions
- Engineering BR checks cross-artifact consistency

---

## Context Directory

Every `/brocode` run creates:

```
.sdlc/<id>/
  00-brief.md
  00-input-raw.md              (if external doc ingested)
  01-requirements.md           PM
  02-design.md                 Designer
  03-investigation.md          SWE (investigate mode)
  03-implementation-options.md SWE (spec mode)
  04-architecture.md           Staff SWE
  05-ops.md                    SRE
  06-test-cases.md             QA
  threads/
    product-conversation.md
    eng-conversation.md
    eng-product-conversation.md
  07-product-br-reviews/       Product BR challenges + approvals
  07-eng-br-reviews/           Engineering BR challenges + approvals
  08-final-spec.md             Final approved output
```

---

## Resume

If `.sdlc/` exists with prior work, `/brocode` resumes from last approved stage.
State what exists, what's next, ask user to confirm or redirect.

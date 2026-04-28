---
template: templates-index
artifact: templates/README.md
producer: system
mode: reference
ai_instructions: >
  This file is the index of all brocode artifact templates.
  Each template has YAML frontmatter that agents can parse to understand:
    - which artifact to produce
    - who produces it
    - who challenges it
    - required sections
    - AI filling instructions
  To use a template: copy it to the appropriate .brocode/<id>/ path, then fill all [bracketed] placeholders.
---

# brocode Templates

Machine-readable, AI-agent-compatible templates for every artifact in the brocode SDLC system.

## How Templates Work

Every template has YAML frontmatter with fields agents can parse:

| Field | Purpose |
|-------|---------|
| `template` | Template identifier |
| `artifact` | Target file path relative to `.brocode/<id>/` |
| `producer` | Which agent writes this artifact |
| `challenger` | Which agent challenges this artifact |
| `mode` | `spec`, `investigate`, `spec_or_investigate`, or `reference` |
| `required_sections` | List of sections that must be present and filled |
| `ai_instructions` | Filling rules the producer agent must follow |

## Template Index

### Product Track

| Template | File | Producer | Challenger |
|----------|------|---------|-----------|
| Product RFC (pRFC) | [product-spec.md](product-spec.md) | PM | Product Bar Raiser |
| UX / UI Design | [ux.md](ux.md) | Designer | Product Bar Raiser |

### Engineering Track

| Template | File | Producer | Challenger |
|----------|------|---------|-----------|
| Implementation Options | [implementation-options.md](implementation-options.md) | Tech Lead | Engineering Bar Raiser |
| Investigation Report | [investigation.md](investigation.md) | Tech Lead | Engineering Bar Raiser |
| Operations Plan | [ops.md](ops.md) | SRE | Eng BR (via Tech Lead) |
| Test Cases | [test-cases.md](test-cases.md) | QA | Eng BR (via Tech Lead) |
| Final Engineering Spec | [engineering-spec.md](engineering-spec.md) | Tech Lead | Engineering Bar Raiser |
| Implementation Tasks | [tasks.md](tasks.md) | Tech Lead | Engineering Bar Raiser |

### Bar Raiser Files

| Template | File | Used by |
|----------|------|---------|
| BR Challenge | [br-challenge.md](br-challenge.md) | Product BR, Engineering BR |
| BR Approval | [br-approval.md](br-approval.md) | Product BR, Engineering BR |

## Context Directory Layout

```
.brocode/<id>/
  product-spec.md          ← from templates/product-spec.md
  ux.md                    ← from templates/ux.md
  implementation-options.md ← from templates/implementation-options.md
  investigation.md          ← from templates/investigation.md (investigate mode)
  ops.md                    ← from templates/ops.md
  test-cases.md             ← from templates/test-cases.md
  engineering-spec.md       ← from templates/engineering-spec.md
  tasks.md                  ← from templates/tasks.md
  br/
    product/
      req-challenge-r1.md   ← from templates/br-challenge.md
      req-approved.md       ← from templates/br-approval.md
      ux-challenge-r1.md    ← from templates/br-challenge.md
      ux-approved.md        ← from templates/br-approval.md
      gate-approved.md      ← from templates/br-approval.md
    engineering/
      impl-challenge-r1.md  ← from templates/br-challenge.md
      impl-approved.md      ← from templates/br-approval.md
      ops-challenge-r1.md   ← from templates/br-challenge.md
      ops-approved.md       ← from templates/br-approval.md
      qa-challenge-r1.md    ← from templates/br-challenge.md
      qa-approved.md        ← from templates/br-approval.md
```

## Filling Rules (All Templates)

1. Every `[bracketed]` placeholder must be filled with real content before the artifact is shared
2. No placeholder may remain unfilled — a placeholder is not a valid "TBD"
3. All mermaid diagrams must be complete — no empty blocks or placeholder comments
4. Append `## Changes from BR Challenge round <N>` on each revision
5. Increment `Version` field on each revision

## Agent Dispatch Order

```
Spec mode:
  PM → product-spec.md
  Designer → ux.md
  Product BR challenges each (max 3 rounds)
  [GATE: engineering blocked until gate-approved.md written]
  Tech Lead → implementation-options.md
  SRE → ops.md  (parallel)
  QA → test-cases.md  (parallel)
  Engineering BR challenges each via Tech Lead (max 3 rounds)
  Tech Lead → engineering-spec.md + tasks.md
  Engineering BR final verification

Investigate mode:
  Tech Lead → investigation.md
  SRE → ops.md  (blast radius, parallel)
  QA → test-cases.md  (failing test, parallel)
  Engineering BR challenges via Tech Lead (max 3 rounds)
  Tech Lead → engineering-spec.md + tasks.md
  Engineering BR final verification
```

---
name: sdlc-bar-raiser-loop
description: Use when a Bar Raiser (product or engineering) needs to run the challenge-response-approval loop against a producer artifact
---

# Bar Raiser Loop

The adversarial loop between a Bar Raiser and a producer. Runs until approved or escalated.

## Protocol

```
Round 1:
  BR reads artifact
  BR writes challenge file (or approval if no gaps found)
  If challenged: producer reads challenge, revises artifact, appends Changes section
  BR reads revised artifact

Round 2 (if Round 1 challenged):
  BR writes challenge file (or approval)
  If challenged: producer revises again

After Round 2 still challenged:
  BR writes escalation file
  Orchestrator surfaces exact question to user
  User answers → BR re-reviews with new information
```

## File naming

Product BR:
```
07-product-br-reviews/
  01-pm-challenge-round1.md
  01-pm-challenge-round2.md
  01-pm-approved.md
  02-design-challenge-round1.md
  02-design-approved.md
  gate-approved.md              ← written when BOTH pm + design approved
```

Engineering BR:
```
07-eng-br-reviews/
  01-swe-challenge-round1.md
  01-swe-approved.md
  02-staff-swe-challenge-round1.md
  02-staff-swe-approved.md
  03-sre-approved.md
  04-qa-challenge-round1.md
  04-qa-approved.md
```

## Challenge rules

- Every challenge has an artifact section reference
- Every challenge has a specific required resolution — not "improve this", but "provide X"
- BR never rewrites artifact for producer
- BR never adds new requirements beyond original brief
- BR challenges substance gaps only — not style

## Producer response rules

- Respond to every challenge by number (C1, C2, ...)
- Defend with evidence OR revise — no silent changes
- Append `## Changes from BR Challenge` section at end of artifact
- Increment Version N in artifact header

## Approval conditions

- All challenges from the latest round are resolved
- No new substance gaps introduced by revision
- Artifact version incremented

## Escalation conditions

- Same challenge unresolved after 2 producer responses
- Fundamental scope ambiguity that requires user decision
- Two valid implementations with opposite tradeoffs — user must choose

## Orchestrator responsibilities during loop

- After BR writes challenge: dispatch producer to revise
- After producer revises: dispatch BR to re-review
- Track round count — stop at 2, escalate
- Never let the loop run silently — report each round to user:
  "[Stage] Round [N]: BR challenged [N] items. [Producer] is revising."
  "[Stage] Round [N]: BR approved. Proceeding."

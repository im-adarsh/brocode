---
name: sdlc-investigate
description: Use when user reports a bug, incident, unexpected behavior, or test failure — triggers oncall-style multi-agent investigation
---

# SDLC Investigate

Oncall-style bug investigation. Systematic. Token-efficient. Finds root cause before proposing any fix.

## When to Use

- User reports a bug or error
- Production incident or alert
- Test failure with unknown cause
- Unexpected behavior in any system

## Pre-Flight

1. Generate investigation ID: `inv-YYYYMMDD-[slug]` (e.g. `inv-20260426-auth-timeout`)
2. Create context directory: `.sdlc/<id>/`
3. Create thread directories: `.sdlc/<id>/threads/`
4. Write `00-brief.md` from user input
5. **Dispatch TPM** (reads `agents/tpm.md`) — TPM creates `00-tpm-log.md` and runs for the full investigation, logging every stage transition, BR round, and blocker

```markdown
# Investigation Brief
**ID:** [id]
**Created:** [date]
**Reported by:** [user]
**Status:** IN PROGRESS

## Problem Statement
[Exact description from user]

## Input Sources
[Text / image / doc — list what was provided]

## Initial Scope
[What system/feature is affected]
```

## Agent Dispatch — Phase 1 (Parallel)

Dispatch SWE and SRE simultaneously — they are independent:

**Tech Lead agent** — reads `agents/tech-lead.md`:
- Reproduce the bug
- Trace data flow to root cause
- Converse with Staff SWE via `threads/eng-conversation.md`
- Produce `03-investigation.md`

**SRE agent** — reads `agents/sre.md`:
- Ask SWE questions about system topology
- Assess operational impact, blast radius
- Produce `05-ops.md` (ops impact section only — no rollback yet, that comes after fix is known)

Both write to `threads/eng-conversation.md`. They can ask each other questions.

## Agent Dispatch — Phase 2 (Sequential)

Once SWE has root cause confirmed:

**Staff SWE agent** — reads `agents/staff-eng.md`:
- Reads `03-investigation.md`
- Converses with SWE via thread
- Validates root cause from architectural perspective
- Checks for systemic causes (not just this instance)
- Produces `04-architecture.md`

## Agent Dispatch — Phase 3

**Engineering Bar Raiser** — reads `agents/engineering-bar-raiser.md`:
- Reviews `03-investigation.md` + `04-architecture.md` + `05-ops.md`
- Challenges root cause claim — is it proven or assumed?
- Challenges fix — does it address root cause or symptom?
- Writes challenge to `07-eng-br-reviews/`
- Tech Lead/Staff SWE must respond and revise
- Max 2 rounds, then escalate to user

## Completion

When Engineering BR approves all artifacts:
- Write `08-final-spec.md` with:
  - Confirmed root cause
  - Approved fix (exact code diff)
  - Test case (failing test proving the bug)
  - Ops impact + rollback steps
- Present to user for implementation decision

## Context File Map

```
.sdlc/<id>/
  00-tpm-log.md             ← TPM master log (live throughout)
  00-brief.md
  03-investigation.md       ← Tech Lead
  04-architecture.md        ← Staff SWE
  05-ops.md                 ← SRE
  threads/
    eng-conversation.md     ← Tech Lead ↔ Staff SWE ↔ SRE exchanges
  07-eng-br-reviews/
    01-swe-challenge-round1.md
    01-swe-approved.md
    ...
  08-final-spec.md          ← Engineering BR approved
```

## Token Efficiency Rules

- Agents read only their required input files — not the full context
- Threads are append-only — agents write new entries, never rewrite
- Each artifact is self-contained — no agent needs to read another agent's thread
- BR reads summaries, not raw logs — each artifact has a summary section

## Iron Laws

1. No fix proposed without confirmed root cause
2. No fix approved without failing test case
3. No escalation skipped — BR must approve before final spec
4. No parallel agents editing the same file

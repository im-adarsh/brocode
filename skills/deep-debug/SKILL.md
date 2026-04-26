# Skill: deep-debug
**Invoked by:** SWE sub-agents (Backend, Frontend, Mobile) when standard investigation fails

## When to Invoke

Spawn a deep-debug sub-sub-agent when any of these are true:

- Two or more hypotheses eliminated without finding root cause
- Bug is intermittent (not reliably reproducible)
- Failure spans 3+ architectural layers
- Symptoms contradict each other (e.g. passes locally, fails in prod, different error each time)
- You are tempted to propose a fix before confirming root cause

**Iron Law:** No fix proposed without confirmed root cause. If you don't know WHY, you don't fix yet.

## Sub-Sub-Agent Protocol

When invoked, spawn an Agent with this prompt structure:

```
You are a deep-debug specialist. Your only goal is to confirm root cause.

## Bug Summary
[paste the bug description from 00-brief.md]

## Symptoms Observed
[list each symptom with evidence — logs, traces, test output]

## Hypotheses Already Eliminated
[list each one and why it was ruled out, with evidence]

## Current Leading Hypothesis
[state the current best guess — must be falsifiable]

## Codebase Path
[paste the relevant repo path from .brocode-repos.json]

## Your Task
Run the 4-phase deep debug protocol below. Return ONLY a confirmed root cause with evidence. Do not propose fixes.
```

## 4-Phase Deep Debug Protocol

### Phase 1: Root Cause Investigation

Gather all observable evidence before forming any hypothesis:

- Collect exact error messages (quoted verbatim — no paraphrase)
- Capture stack traces in full
- Note environment differences (local vs staging vs prod, OS, versions)
- Log the precise sequence of events before failure
- Identify what changed recently (git log, deploy history, config changes)

**Output:** Evidence log — symptoms with timestamps and sources

---

### Phase 2: Pattern Analysis

Analyze the evidence for patterns before hypothesizing:

- When does it happen vs not happen? (frequency, conditions, user type)
- What do all failures have in common?
- What do all successes have in common?
- Is the failure deterministic or probabilistic?
- Does it correlate with load, time, data size, or specific input?

**Techniques:**
- Binary search: disable half the system to narrow the blast radius
- Differential debugging: find the smallest diff between "works" and "fails"
- Working backwards: start at the failure point, trace causality upstream
- Minimal reproduction: strip everything until the bug is isolated

**Output:** Pattern summary — conditions that produce the failure

---

### Phase 3: Hypothesis Testing

Form one hypothesis at a time. Each must be falsifiable.

**Hypothesis format:**
```
Hypothesis: [specific claim about root cause]
Prediction: If true, then [observable test outcome]
Test: [exact steps to verify — grep for X, run Y, check log Z]
Success criteria: [what confirms it]
Failure criteria: [what eliminates it]
```

**Rules:**
- One hypothesis at a time — do not test multiple simultaneously
- Test must be observable and measurable
- If confirmed: document evidence and proceed to Phase 4
- If eliminated: log it in "Eliminated Hypotheses" and form next hypothesis
- Never revisit an eliminated hypothesis

**Eliminated Hypotheses Log** (append-only):
```
[HX] [hypothesis statement] → ELIMINATED because [evidence]
```

**Bias traps to avoid:**
- Confirmation bias: don't look only for evidence that confirms your guess
- Anchoring bias: your first hypothesis is not special — test it like any other
- Availability bias: "we've seen this before" is not evidence
- Sunk cost: 3+ failed hypotheses means question your frame, not just your guesses

**If 3+ hypotheses eliminated:** Stop. Question the frame. Re-read the symptoms from scratch. Ask: what assumption am I making about the system that might be wrong?

---

### Phase 4: Root Cause Confirmation

Before declaring root cause:

1. State the root cause as a single, specific claim
2. Show direct evidence (log line, code path, test failure, trace)
3. Explain the causal chain: X caused Y because Z
4. Verify: does this explanation account for ALL symptoms?
5. Verify: does this explanation account for why it DOESN'T happen in working cases?

**If any symptom is unexplained:** root cause is not confirmed — return to Phase 3.

**Return format:**
```
## Root Cause: [one sentence]

**Evidence:**
- [specific log line / code path / test output]
- [additional evidence]

**Causal chain:**
[step 1] → [step 2] → [step 3] → [failure]

**Explains all symptoms:** yes/no — [if no, list unexplained symptoms]

**Eliminated hypotheses:**
- [H1] [statement] → eliminated: [evidence]
- [H2] [statement] → eliminated: [evidence]
```

---

## Debug File Protocol

Sub-sub-agent writes to `.sdlc/<id>/threads/debug-<domain>.md`:

```markdown
# Deep Debug: [Bug ID] — [Domain]

## Status: gathering | investigating | root-cause-confirmed

## Evidence Log
[append-only: each piece of evidence with source and timestamp]

## Eliminated Hypotheses
[append-only: each eliminated hypothesis with elimination evidence]

## Current Hypothesis
[one at a time — overwrite this section]

## Root Cause (when confirmed)
[final confirmed root cause with evidence]
```

File is append-only for Evidence Log and Eliminated Hypotheses sections. Never rewrite prior entries.

---

## Handoff Back to Parent Agent

Sub-sub-agent returns to the invoking SWE agent:

```
Deep debug complete.

Root Cause: [one sentence]
Evidence: [summary of key evidence]
Causal chain: [brief chain]
Confidence: HIGH / MEDIUM (if medium, state what's uncertain)

Recommend: [hand back to SWE for fix proposal]
```

Parent SWE agent then proposes a fix based on the confirmed root cause. If confidence is MEDIUM, SWE Coordinator must note the uncertainty in `swe-debate.md` before proceeding.

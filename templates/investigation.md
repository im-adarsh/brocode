---
template: investigation
artifact: investigation.md
producer: Tech Lead
challenger: Engineering Bar Raiser
mode: investigate
version_field: true
status_values: [DRAFT, REVISED, APPROVED]
required_sections: [symptom, reproduction, domain_trace, evidence, root_cause, swe_debate_summary, impact, proposed_fix, test_case]
ai_instructions: >
  Fill every [bracketed] placeholder with real content.
  Root cause must be one precise sentence — no vague language.
  Evidence must be verbatim logs/stack traces/metrics — not paraphrased.
  Proposed fix must be an exact diff — not a description of a fix.
  Test case must be real code that fails before fix and passes after.
  Alternatives ruled out must explain WHY each was eliminated, not just list them.
  Append "## Changes from BR Challenge round <N>" on each revision.
---

# Investigation Report
**Investigation ID:** [id]
**Version:** [N]
**Status:** DRAFT | REVISED | APPROVED
**Domain(s):** [Backend | Frontend | Mobile | Cross-domain]

---

## Symptom
[Exact error message, unexpected behavior, or user-observable failure. Quote error strings verbatim. Do not paraphrase.]

---

## Reproduction
[Exact steps to reproduce:]
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Commands:**
```bash
# Exact commands to reproduce
```

**State required:** [database state, feature flags, user role, env vars needed]
**Reproducibility:** [Always | Flaky N% | Only under condition X]
**Environments affected:** [prod | staging | both | specific version]

---

## Domain Trace

### [Domain 1: e.g., Backend]
| Layer | Component | Input | Output | Break point? |
|-------|-----------|-------|--------|--------------|
| API | [handler] | [request] | [response or error] | [Yes/No] |
| Service | [service] | [call] | [result] | [Yes/No] |
| DB | [query] | [params] | [result or error] | [Yes/No] |

[Component → Component: what enters/exits/breaks at each boundary]

### [Domain 2: e.g., Frontend] *(if cross-domain)*
| Layer | Component | Input | Output | Break point? |
|-------|-----------|-------|--------|--------------|
| Component | [component] | [props/state] | [rendered output] | [Yes/No] |
| API call | [endpoint] | [request] | [response handling] | [Yes/No] |

### Cross-Domain Exchange Log
```
[Mobile → Backend]: "Request leaves mobile with header X. What does backend receive?"
[Backend → Mobile]: "We receive header X but reject it because Y."
```

---

## Evidence
[Verbatim logs, stack traces, metrics. Do not paraphrase — paste exact output.]

```
[paste exact log lines, stack trace, or error output here]
```

**Metrics at time of failure:**
| Metric | Normal | At failure | Delta |
|--------|--------|------------|-------|
| [metric name] | [N] | [N] | [+/-N] |

---

## Root Cause
**Root cause:** [One precise sentence — name the exact function/component/condition that is wrong]
**Owning domain:** [Backend | Frontend | Mobile]
**Evidence:** [Specific log line, code path, or metric that proves this]
**Alternatives ruled out:**
| Hypothesis | Why eliminated |
|------------|---------------|
| [hypothesis A] | [concrete evidence that rules it out] |
| [hypothesis B] | [concrete evidence that rules it out] |

---

## SWE Debate Summary
[Key cross-domain exchanges that shaped the root cause conclusion. Show disagreements that became explicit tradeoffs.]

```
[Backend → Frontend]: [key finding or question]
[Frontend → Backend]: [response that changed direction]
[Tech Lead]: [synthesis decision and rationale]
```

---

## Impact
- **Blast radius:** [% users affected, specific features, regions]
- **Data integrity:** [corruption / data loss / none]
- **User impact:** [who is affected, how many, since when]
- **SLO impact:** [which SLOs are breached or at risk]

---

## Proposed Fix

```diff
// File: [exact/path/to/file.ts]:[line number]
- [current broken code]
+ [fixed code]
```

**Why this fix:** [one sentence explaining the mechanism]
**Risk of fix:** [Low / Medium / High — what could go wrong]
**Migration needed:** [Yes — describe / No]

---

## Test Case
[Failing test that proves the bug exists before fix. Must fail before fix, pass after.]

```[lang]
// File: tests/[path]/[file].test.[ext]
describe('[unit under test]', () => {
  it('[describes the bug scenario]', async () => {
    // Setup: exact state that triggers the bug
    
    // Action: exact call that fails
    const result = await [functionUnderTest]([input]);
    
    // Assert: exact behavior expected (not current broken behavior)
    expect(result).toEqual([expected]);
  });
});
```

**Run command:** `[exact test command]`
**Expected before fix:** FAIL — `[exact error message]`
**Expected after fix:** PASS

---

## Changes from BR Challenge
[Added on each revision — address each BR challenge by number C1, C2, ...]

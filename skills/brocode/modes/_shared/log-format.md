# Shared: Log Format
<!-- Referenced by tpm.md and mode files. Authoritative source for E-NNN/D-NNN format. -->

`tpm-logs.md` is append-only. Two entry kinds: **Events** (`E-NNN`) and **Decisions** (`D-NNN`).

## E-NNN — One-line format (default)

```
### [E-NNN] HH:MM · TYPE · AGENT — short summary
```

`TYPE` ∈ DISPATCH | START | ARTIFACT | THREAD-OPEN | THREAD-RESOLVE | CONVO | APPROVE | GATE | NOTE

Examples:
```
### [E-042] 14:32 · DISPATCH · Backend Engineer — backend-phase2.md
### [E-043] 14:33 · THREAD-OPEN · PM — empty-state-first-time-users.md (PM ↔ Tech Lead)
### [E-044] 14:38 · ARTIFACT · QA — test-cases.md v1, 24 tests
### [E-045] 14:38 · APPROVE · Engineering BR — ops.md v2 approved
### [E-046] 14:39 · GATE · Product BR — product gate OPEN, engineering unblocked
```

For ARTIFACT events that produce a file with elapsed timing, append `(N min)`:
```
### [E-047] 14:42 · ARTIFACT · Tech Lead — implementation-options.md v1 (8 min)
```

## E-NNN — Block format (only for high-signal events)

Use block format **only** for: CHALLENGE · REVISE · BLOCK · UNBLOCK · ESCALATE · COMPLETE.

CHALLENGE block:
```
### [E-NNN] HH:MM · CHALLENGE · <BR> (Round N on <artifact>)
**[N] challenges raised:**
- C1: <title> — <one line>
- C2: <title> — <one line>
**→ Next:** <producer> to revise
```

REVISE block:
```
### [E-NNN] HH:MM · REVISE · <agent>
Revised to **<artifact> v<N+1>**
- <what changed> [see D-NNN, D-NNN]
**Revision elapsed:** N min (challenge HH:MM → revision HH:MM)
**→ Next:** <BR>
```

ESCALATE block:
```
### [E-NNN] HH:MM · ESCALATE · TPM
**[<BR>] and [<producer>] unresolved after <rounds> rounds on [<artifact>]**

History:
- Round 1: <challenge title> — <producer response> — <why BR rejected>
- Round 2: <challenge title> — <producer response> — <why BR rejected>
- Round 3: <challenge title> — <producer response> — <why BR rejected>

Still unresolved: <exact gap in one sentence>
**Question for user:** <one specific question>
```

COMPLETE block: see `templates/tpm-logs.md` for Performance Summary + Decision Index tables.

## D-NNN — Always block format

```
### [D-NNN] HH:MM · DECISION · <agent>
**[Decision title]**

| Option | Description | Why considered / rejected |
|--------|-------------|--------------------------|
| A | [option] | [why rejected or "✓ chosen"] |
| B ✓ | [option] | Chosen — [one-line reason] |

**Chose:** B
**Rationale:** <tied to brief / requirement / pattern / constraint — never just "it's better">
**Downstream impact:** <named agents / artifacts affected>
**Revisit if:** <real condition — never "if user disagrees">
```

## Numbering

- E-NNN and D-NNN both global, monotonic across the entire run.
- Never edit a past entry. Revisited decisions get a new D-NNN that references the original.

## Volume

- A full SPEC run produces 30–50 log entries. Fewer than 20 indicates under-logging.
- Parallel execution does NOT collapse entries — 5 parallel dispatches = 5 separate E-NNN entries.
- Each artifact version (v1, v2, v3) gets its own ARTIFACT entry.

## When to write D-NNN

Always write D-NNN when:
- Agent picks between multiple options
- BR challenge forces revision — what did producer choose?
- Cross-agent conversation produces an agreement
- User resolves a blocker (also see `_shared/conversation-logging.md`)
- Tech Lead picks domains to dispatch
- Tech Lead synthesizes findings and recommends an option
- SRE chooses a rollback strategy
- Thread resolves

Bad D-NNN entries (do NOT write):
- Single-option tables ("do it" vs "don't do it")
- Rationale that restates the decision
- Missing downstream impact
- Vague "revisit if"

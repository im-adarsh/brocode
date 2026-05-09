# brocode: investigate mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: bug / crash / error / broken -->

## Required reading (load on first use this mode)
- `skills/brocode/modes/_shared/instruction-protocol.md`
- `skills/brocode/modes/_shared/log-format.md`
- `skills/brocode/modes/_shared/conversation-logging.md`
- `skills/brocode/modes/_shared/br-loop.md`
- `skills/brocode/modes/_shared/dispatch-fanout.md`
- `skills/brocode/modes/_shared/postlude.md`

## Step 2: INVESTIGATE flow

### Pre-flight

1. Generate ID: `inv-YYYYMMDD-<slug>`
2. Create `.brocode/<id>/`, `threads/`, `br/engineering/`, `instructions/`
3. Write `.brocode/<id>/brief.md` from user input
4. Write `.brocode/<id>/conversation.md` header per `_shared/conversation-logging.md`
5. Read `~/.brocode/repos.json`
6. TPM logs (one-line per `_shared/log-format.md`):
   - `E-NNN · DISPATCH · TPM` — run started, ID assigned
   - `E-NNN · ARTIFACT · TPM` — brief.md + conversation.md initialized
7. Append USER entry to `conversation.md` for the original prompt
8. TodoWrite — initialize run todo list:
   - `📋 TPM → brief.md written` (mark `completed`)
   - `🤝 Tech Lead → triage`
   - `🤝 Tech Lead → dispatching team`
   - `⚙️ Engineers → parallel investigation`
   - `🤝 Tech Lead → investigation.md`
   - `⚖️ Engineering BR → review`
   - `🤝 Tech Lead → final spec + tasks`
   - `⚖️ Engineering BR → final check`
   - `📋 TPM → ADR extraction + brocode.md`

### Org

```text
TPM (you) — orchestrator
└── Engineering Track
    ├── Tech Lead sub-agent
    │   ├── Backend Engineer (scope-based, parallel)
    │   ├── Frontend Engineer (scope-based, parallel)
    │   ├── Mobile Engineer (scope-based, parallel)
    │   ├── SRE (parallel — ops + blast radius + infra)
    │   └── QA (parallel — failing test + test surface)
    └── Engineering BR sub-agent (fresh per round)
```

### Phase 1: Tech Lead triage + clarifying questions

TPM writes `instructions/tech-lead-triage.md` (per `_shared/instruction-protocol.md`):
```text
What to do:
  1. Read brief.md in full.
  2. Identify ambiguities that block investigation — missing repro, unclear scope,
     unknown domain, missing env info.
  3. Write clarifying questions to threads/tech-lead-brief-questions.md.
     Format: [Tech Lead → TPM]: <question>
  4. When satisfied, write threads/tech-lead-ready.md with confirmed domain scope
     (Backend / Frontend / Mobile / cross-domain) and key constraints.
Files to read: .brocode/<id>/brief.md
Threads: threads/tech-lead-brief-questions.md
Constraints: Do not dispatch team until scope confirmed.
```

Print: `🤝 Tech Lead → triaging brief, may ask clarifying questions`
Dispatch Tech Lead. If questions surface to user, capture in `conversation.md` per `_shared/conversation-logging.md`. Append answers to thread, re-check Tech Lead.
Print when ready: `🤝 Tech Lead → scope confirmed, dispatching team`

Print: `📦 TPM → compacting context before Tech Lead dispatch`
Run: `/compact`

### Phase 2: Tech Lead team dispatch

Per `_shared/dispatch-fanout.md`. TPM writes `instructions/tech-lead-investigate.md`:
```text
What to do:
  1. Read ~/.brocode/wiki/index.md.
  2. Read threads/tech-lead-ready.md for domain scope.
  3. Write instruction files for in-scope engineers + SRE + QA per
     _shared/dispatch-fanout.md scoping rules.
  4. Dispatch all in parallel.
  5. Read findings from threads/. Synthesize investigation.md
     (root cause, evidence, fix, failing test).
  6. After all artifacts BR-approved, write engineering-spec.md + tasks.md
     per agents/_includes/tech-lead/templates.md.
Files to read: .brocode/<id>/brief.md, threads/tech-lead-ready.md,
               ~/.brocode/repos.json, ~/.brocode/wiki/index.md
File to write (now): .brocode/<id>/investigation.md
File to write (later): engineering-spec.md, tasks.md
Constraints:
  - No fix without confirmed root cause
  - No fix without failing test case
  - Sole producer of engineering-spec.md and tasks.md
  - Engineering BR challenges but never writes spec
  - Sole interface to Engineering BR — SRE/QA never talk to BR directly
```

Print: `🤝 Tech Lead → dispatching team`
Dispatch Tech Lead. Per-sub-agent DISPATCH/THREAD-OPEN/ARTIFACT logging follows `_shared/dispatch-fanout.md` (no `product-spec.md` in scope for investigate mode — sub-agents see only `brief.md` slices).

Print: `📦 TPM → compacting context before Engineering BR loop`
Run: `/compact`

### Phase 3: Engineering BR loop

For each artifact in [`investigation.md`, `ops.md`, `test-cases.md`]:
- Run BR loop per `_shared/br-loop.md` with:
  BR = Engineering BR · producer = Tech Lead · rounds = `<engineering_rounds>` · gate-dir = `br/engineering/`
- Tech Lead routes BR challenges to internal sub-agent (SRE / QA / Backend / Frontend / Mobile), synthesizes response.

### Phase 4: Final spec

When all three artifacts approved, run `_shared/postlude.md` (P1 → P6).
Postlude includes investigate-only `evidence.md` write at step P3.

### Iron laws

1. No fix proposed without confirmed root cause
2. No fix approved without failing test case
3. Engineering BR challenges but never writes the spec
4. No parallel agents editing the same file
5. Tech Lead is sole producer of `engineering-spec.md` and `tasks.md`
6. Every user-facing exchange logged to `conversation.md` with redaction

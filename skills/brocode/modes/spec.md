# brocode: spec mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: feature / spec / build / design -->

## Required reading (load on first use this mode)
- `skills/brocode/modes/_shared/instruction-protocol.md`
- `skills/brocode/modes/_shared/log-format.md`
- `skills/brocode/modes/_shared/conversation-logging.md`
- `skills/brocode/modes/_shared/br-loop.md`
- `skills/brocode/modes/_shared/dispatch-fanout.md`
- `skills/brocode/modes/_shared/postlude.md`

## Step 3: SPEC flow

### Pre-flight

1. Generate ID: `spec-YYYYMMDD-<slug>`
2. Create `.brocode/<id>/`, `threads/`, `br/product/`, `br/engineering/`, `instructions/`
3. Handle external input: if URL/doc, fetch via available MCP (Google Drive / browser) or ask user to paste. If image, describe.
4. Write `.brocode/<id>/brief.md`
5. Write `.brocode/<id>/conversation.md` header per `_shared/conversation-logging.md`
6. Read `~/.brocode/repos.json`
7. TPM logs (one-line per `_shared/log-format.md`):
   - `E-NNN · DISPATCH · TPM` — run started, ID assigned
   - `E-NNN · ARTIFACT · TPM` — brief.md + conversation.md initialized
8. Append USER entry to `conversation.md` for the original user prompt that triggered this run.
9. TodoWrite — initialize run todo list, all `pending`:
   - `📋 TPM → brief.md written` (mark `completed` immediately)
   - `🎯 PM → product-spec.md`
   - `🔬 Product BR → review`
   - `🔓 Product gate → engineering unlocked`
   - `🤝 Tech Lead → reviewing product artifacts`
   - `🤝 Tech Lead → dispatching team`
   - `⚙️ Engineers → parallel investigation`
   - `🤝 Tech Lead → implementation-options.md`
   - `⚖️ Engineering BR → review`
   - `🤝 Tech Lead → final spec + tasks`
   - `⚖️ Engineering BR → final check`
   - `📋 TPM → ADR extraction + brocode.md`

### Org

```
TPM (you) — orchestrator
├── Product Track (gates engineering)
│   ├── PM sub-agent — product-spec.md (incl. section 15 UX flows)
│   └── Product BR sub-agent (fresh per round) — gates engineering
└── Engineering Track (starts only after Product BR gate open)
    ├── Tech Lead sub-agent
    │   ├── Backend Engineer (parallel)
    │   ├── Frontend Engineer (parallel)
    │   ├── Mobile Engineer (parallel)
    │   ├── SRE (parallel)
    │   └── QA (parallel)
    └── Engineering BR sub-agent (fresh per round)
```

### Phase 1 — Product Track

#### Step 1a: PM dispatch

TPM writes `instructions/pm-phase1.md` (per `_shared/instruction-protocol.md`):
```
What to do: Read brief.md. Produce product-spec.md including UX flows
  (section 15) — e2e mermaid per persona, screen states, error states.
Files to read: .brocode/<id>/brief.md
File to write: .brocode/<id>/product-spec.md
Threads: create threads/<topic>.md per discussion topic
Constraints: All personas covered. Every AC testable + measurable.
```

Print: `🎯 PM → dispatched`
TPM logs: `E-NNN · DISPATCH · PM` — instruction file written
Dispatch PM sub-agent.
TPM logs after artifact written: `E-NNN · ARTIFACT · PM` — product-spec.md v1, N personas, N ACs

#### Step 1b: Product BR loop on `product-spec.md`

Run BR loop per `_shared/br-loop.md` with:
- BR = Product BR · producer = PM · artifact = `product-spec.md` · rounds = `<product_rounds>` · gate-dir = `br/product/`

When approved:
- Print: `📦 TPM → compacting context before product gate + engineering track`
- Run: `/compact`
- Write `br/product/gate-approved.md`
- TPM logs: `D-NNN · DECISION · TPM` — product gate decision
- TPM logs: `E-NNN · GATE · Product BR` — engineering unblocked
- Append SURFACE entry to `conversation.md`: gate open announcement
- Print: `🔓 TPM → [D-NNN] product gate OPEN — engineering starts`

**Engineering track does NOT start until gate approved.**

### Phase 2 — Engineering Track

#### Step 2a: Tech Lead reviews product artifacts

TPM writes `instructions/tech-lead-review-product.md`:
```
What to do:
  1. Read product-spec.md in full.
  2. Identify ambiguities/missing tech details/constraints that block engineering.
  3. Write clarifying questions to threads/tech-lead-product-questions.md.
     Format: [Tech Lead → PM]: <question>
  4. TPM routes questions to PM who appends answers to thread.
  5. When satisfied, write threads/tech-lead-ready.md with key constraints.
Files to read: .brocode/<id>/product-spec.md
Threads: threads/tech-lead-product-questions.md
Constraints: Do not dispatch team until questions resolved.
```
Print: `🤝 Tech Lead → reviewing product artifacts`
TPM logs: `E-NNN · DISPATCH · Tech Lead`
Dispatch Tech Lead sub-agent.

If Tech Lead has questions:
- TPM logs `E-NNN · THREAD-OPEN · Tech Lead`
- Dispatch PM (fresh) to answer via thread
- TPM logs `E-NNN · CONVO · PM → Tech Lead`
- If question requires user input, sub-agent emits Conversation Entry — TPM appends to `conversation.md` per `_shared/conversation-logging.md`
- Re-check Tech Lead

When ready: TPM logs `E-NNN · ARTIFACT · Tech Lead` — threads/tech-lead-ready.md written
Print: `🤝 Tech Lead → ready, dispatching team`

#### Step 2b: Tech Lead team dispatch

Per `_shared/dispatch-fanout.md`. TPM writes `instructions/tech-lead-phase2.md`:
```
What to do:
  1. Read ~/.brocode/wiki/index.md for system topology.
  2. Read threads/tech-lead-ready.md.
  3. Write instruction files for Backend, Frontend, Mobile, SRE, QA per
     _shared/dispatch-fanout.md scoping rules.
  4. Dispatch all 5 in parallel.
  5. Read findings from threads/. Synthesize implementation-options.md
     (3 options with real code sketches, tradeoffs, recommendation).
  6. After all artifacts BR-approved, write engineering-spec.md + tasks.md
     per agents/_includes/tech-lead/templates.md.
Files to read: .brocode/<id>/product-spec.md, threads/tech-lead-ready.md,
               .brocode/<id>/decisions.md (if exists, for D-NNN context),
               ~/.brocode/repos.json, ~/.brocode/wiki/index.md
File to write (now): .brocode/<id>/implementation-options.md
File to write (later): .brocode/<id>/engineering-spec.md, .brocode/<id>/tasks.md
Constraints:
  - Sole producer of engineering-spec.md and tasks.md
  - Engineering BR challenges but never writes spec
  - 3 implementation options with real code sketches
  - Sole interface to Engineering BR — SRE/QA never talk to BR directly
```

Print: `🤝 Tech Lead → dispatching team`
Dispatch Tech Lead sub-agent. Per-sub-agent DISPATCH/THREAD-OPEN/ARTIFACT logging follows `_shared/dispatch-fanout.md`.

After Tech Lead synthesizes:
- `D-NNN · DECISION · Tech Lead` — implementation option chosen
- `E-NNN · ARTIFACT · Tech Lead` — implementation-options.md v1

Print: `📦 TPM → compacting context before Engineering BR loop`
Run: `/compact`

#### Step 2c: Engineering BR loop

For each artifact in [`implementation-options.md`, `ops.md`, `test-cases.md`]:
- Run BR loop per `_shared/br-loop.md` with:
  BR = Engineering BR · producer = Tech Lead · rounds = `<engineering_rounds>` · gate-dir = `br/engineering/`
- Engineering BR reads ALL three eng artifacts each round (cross-consistency check). For artifacts unchanged since last round, BR may skip re-read — instruction file passes the artifact's last-approved hash.
- When BR challenges Tech Lead, Tech Lead routes internally:
  - ops.md challenges → SRE
  - test-cases.md challenges → QA
  - implementation challenges → Backend/Frontend/Mobile
  Tech Lead synthesizes responses → writes revision.

#### Step 2d: Final spec

When all three artifacts approved, run `_shared/postlude.md` (P1 → P6).

### Iron laws

1. Product BR must approve before engineering starts
2. Tech Lead is sole producer of `engineering-spec.md` and `tasks.md`
3. Engineering BR challenges but never writes the spec
4. Max `<engineering_rounds>` BR rounds per artifact — escalate to user if unresolved
5. No agent edits another agent's artifact
6. Every user-facing exchange logged to `conversation.md` with redaction (per `_shared/conversation-logging.md`)

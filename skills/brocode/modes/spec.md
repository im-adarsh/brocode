# brocode: spec mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: feature / spec / build / design -->

## Step 3: SPEC flow

### Pre-flight
1. Generate ID: `spec-YYYYMMDD-<slug>`
2. Create `.brocode/<id>/`, `.brocode/<id>/threads/`, `.brocode/<id>/br/product/`, `.brocode/<id>/br/engineering/`, `.brocode/<id>/instructions/`
3. Handle external input: if URL/doc attached, fetch content (Google Drive MCP if available, else ask user to paste). If image, describe it.
4. Write `.brocode/<id>/brief.md`
5. Read `~/.brocode/repos.json` for repo paths
6. TPM logs:
   - `E-NNN · DISPATCH · TPM` — run started, ID assigned
   - `E-NNN · ARTIFACT · TPM` — brief.md written from user input
7. TodoWrite: initialize run todo list — all items `pending`:
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
TPM (you) — orchestrator, logs all transitions, writes instruction files before every dispatch
├── Product Track (gates engineering)
│   ├── PM sub-agent — requirements, personas, journeys, ACs, UX flows (section 15)
│   └── Product BR sub-agent (fresh per round) — challenges product-spec.md, gates engineering
└── Engineering Track (starts only after Product BR gate open)
    ├── Tech Lead sub-agent — dispatches team, synthesizes, writes engineering-spec + tasks
    │   ├── Backend Engineer sub-agent (parallel)
    │   ├── Frontend Engineer sub-agent (parallel)
    │   ├── Mobile Engineer sub-agent (parallel)
    │   ├── SRE sub-agent (parallel — ops + infra)
    │   └── QA sub-agent (parallel — test matrix)
    └── Engineering BR sub-agent (fresh per round) — challenges artifacts, never writes spec
```

### Phase 1 — Product Track

**Step 1a: PM**
TPM writes `.brocode/<id>/instructions/pm-phase1.md`:
```
# Instruction: PM — phase 1
Run ID: <id>
Your agent file: agents/pm.md
What to do: Read brief.md. Produce product-spec.md including UX flows (section 15) with e2e mermaid diagram per persona, screen states, and error states.
Files to read: .brocode/<id>/brief.md
  (Do NOT read product-spec.md or thread files — not yet written)
File to write: .brocode/<id>/product-spec.md
Threads: create .brocode/<id>/threads/<topic>.md per discussion topic as needed
Constraints: All personas covered. Every AC testable and measurable.
```
Print: `🎯 PM → dispatched`
TPM logs: `E-NNN · DISPATCH · PM` — instruction file written, building product-spec.md
Dispatch PM sub-agent (reads `agents/pm.md` + its instruction file).
TPM logs (after PM writes product-spec.md): `E-NNN · ARTIFACT · PM` — product-spec.md v1 written, N personas, N ACs

**Step 1b: Product BR loop**

For each artifact (`product-spec.md` only):
```
round = 1
loop:
  TPM writes: .brocode/<id>/instructions/product-br-round<round>-<artifact>.md
  Print: 📋 TPM → instruction written: instructions/product-br-round<round>-<artifact>.md
  TPM logs: E-NNN · DISPATCH · Product BR  (round <round>, artifact: <artifact>)

  Dispatch Product BR sub-agent (fresh context):
    - reads artifact + all prior challenge files for this artifact
    - reads agents/product-bar-raiser.md + its instruction file
    - uses web search when competitors referenced
    - either: writes br/product/<N>-<artifact>-challenge-round<round>.md
    - or:     writes br/product/<N>-<artifact>-approved.md → BREAK loop

  if challenged:
    print: ⚠️  🔬 Product BR  →  [N challenges on <artifact>] (round <round>)
    TPM logs: E-NNN · CHALLENGE · Product BR  (round <round>)  — list each challenge title
    dispatch producer sub-agent (PM, fresh context):
      - reads challenge file + current artifact + their agent file + their original instruction
      - revises artifact (appends ## Changes from Product BR Challenge round <round>)
      - notifies other agent if change affects their artifact (appends to thread)
    TPM logs: D-NNN per choice the producer made during revision (what changed and why)
    TPM logs: E-NNN · REVISE · [producer]  — list what changed, reference D-NNN entries
    print: 🟢  [producer]  →  revised <artifact> v<round+1>
    round += 1

  if approved:
    TPM logs: E-NNN · APPROVE · Product BR  — artifact + version approved

  if round > <product_rounds>:
    print: 🚫  🔬 Product BR  →  ESCALATE: unresolved after <product_rounds> rounds on <artifact>
    TPM logs: E-NNN · ESCALATE · TPM  — full <product_rounds>-round history, exact unresolved gap, question for user
    surface exact unresolved challenge to user
    wait for user answer before continuing
    break
```

When `product-spec.md` approved:
Write `br/product/gate-approved.md`.
TPM logs: `D-NNN · DECISION · TPM` — gate open decision (options: wait / open now, chosen, rationale)
TPM logs: `E-NNN · GATE · Product BR` — product gate OPEN, engineering unblocked
Print: `🔓 TPM → [D-NNN] product gate OPEN — engineering starts`

**Engineering track does NOT start until Product BR gate is approved.**

### Phase 2 — Engineering Track

**Step 2a: Tech Lead review + clarifying questions**

After product gate opens, TPM writes `.brocode/<id>/instructions/tech-lead-review-product.md`:
```
# Instruction: Tech Lead — review product artifacts
Run ID: <id>
Your agent file: agents/tech-lead.md
What to do:
  1. Read product-spec.md in full.
  2. Identify any ambiguities, missing technical details, or constraints that would
     block engineering (e.g. unclear API contracts, missing error states, undefined
     scalability requirements, conflicting personas).
  3. Write clarifying questions to threads/tech-lead-product-questions.md.
     Format: [Tech Lead → PM]: <question>
  4. TPM routes questions to PM sub-agent who appends answers to the thread.
  5. Once satisfied (or no questions), signal ready: write threads/tech-lead-ready.md
     with a one-line summary of key engineering constraints understood.
Files to read: .brocode/<id>/product-spec.md
Threads: .brocode/<id>/threads/tech-lead-product-questions.md
Constraints: Ask before delegating — do not dispatch team until questions resolved.
```
Print: `🤝 Tech Lead → reviewing product artifacts, may ask clarifying questions`
TPM logs: `E-NNN · DISPATCH · Tech Lead` — reviewing product-spec.md, filing clarifying questions
Dispatch Tech Lead sub-agent.

If Tech Lead has questions:
  TPM logs: `E-NNN · THREAD-OPEN · Tech Lead` — threads/tech-lead-product-questions.md, N questions filed
  TPM dispatches PM (fresh context) to answer via the thread.
  TPM logs: `E-NNN · CONVO · [PM → Tech Lead]` — answers appended to thread
  Then re-checks with Tech Lead.
TPM logs when ready: `E-NNN · ARTIFACT · Tech Lead` — threads/tech-lead-ready.md written, key constraints confirmed
Print when ready: `🤝 Tech Lead → product artifacts understood, dispatching team`

**Step 2b: Tech Lead team dispatch**
TPM writes `.brocode/<id>/instructions/tech-lead-phase2.md`:
```
# Instruction: Tech Lead — phase 2 (spec)
Run ID: <id>
Your agent file: agents/tech-lead.md
What to do:
  1. Read ~/.brocode/wiki/index.md — understand full system topology.
  2. Read threads/tech-lead-ready.md for key engineering constraints from product review.
  3. Write instruction files for Backend, Frontend, Mobile, SRE, QA sub-agents.
  4. Dispatch all 5 in parallel. Each scans knowledge base first, then reads repos.
  5. Read all findings from threads/. Synthesize into implementation-options.md (3 options
     with real code sketches, tradeoffs, and a clear recommendation).
  6. After all artifacts BR-approved, write engineering-spec.md + tasks.md.
Files to read: .brocode/<id>/product-spec.md,
               .brocode/<id>/threads/tech-lead-ready.md,
               .brocode/<id>/tpm-logs.md (D-NNN decision blocks only — skip E-NNN events),
               ~/.brocode/repos.json, ~/.brocode/wiki/index.md
  (Do NOT read ops.md, test-cases.md — not yet written at this stage)
Files to write: .brocode/<id>/implementation-options.md (then later)
                .brocode/<id>/engineering-spec.md, .brocode/<id>/tasks.md
Constraints:
  - You are the sole producer of engineering-spec.md and tasks.md
  - Engineering BR challenges but never writes the spec
  - 3 implementation options required with real code sketches
  - You are the sole interface to Engineering BR — SRE and QA never talk to BR directly
```
Print: `🤝 Tech Lead → dispatching team`
Dispatch Tech Lead sub-agent (reads `agents/tech-lead.md` + its instruction file).

Tech Lead internally writes and dispatches instruction files for:
- `.brocode/<id>/instructions/backend-phase2.md`
- `.brocode/<id>/instructions/frontend-phase2.md`
- `.brocode/<id>/instructions/mobile-phase2.md`
- `.brocode/<id>/instructions/sre-phase2.md`
- `.brocode/<id>/instructions/qa-phase2.md`

Each instruction tells the sub-agent:
- Domain repos from `~/.brocode/repos.json`
- Knowledge base path: `~/.brocode/wiki/<repo-slug>/`
- Thread files to write findings to (`threads/<topic>.md` — descriptive names)
- When to invoke `superpowers:systematic-debugging`
- SRE: produce `ops.md` (ops plan + infra/platform impact)
- QA: produce `test-cases.md` (full test matrix with real test code)
- SRE instruction: include only `brief.md` blast-radius section + `product-spec.md` technical requirements section + relevant domain thread files. Do NOT include implementation-options.md — not yet written.
- QA instruction: include only `brief.md` acceptance-criteria section + `product-spec.md` acceptance criteria section + relevant domain thread files. Do NOT include implementation-options.md — not yet written.
- Backend / Frontend / Mobile instructions: include only their domain section of `brief.md` + their domain's thread files + `~/.brocode/wiki/<their-repo-slug>/` only.

TPM logs one entry per sub-agent dispatched (do not batch — each gets its own block):
- `E-NNN · DISPATCH · Backend Engineer` — instruction file path
- `E-NNN · DISPATCH · Frontend Engineer` — instruction file path
- `E-NNN · DISPATCH · Mobile Engineer` — instruction file path
- `E-NNN · DISPATCH · SRE` — instruction file path
- `E-NNN · DISPATCH · QA` — instruction file path

As each sub-agent produces output, TPM logs one entry per event (as they happen, not all at once):
- `E-NNN · THREAD-OPEN · [sub-agent]` — per thread file created (one entry per file)
- `E-NNN · ARTIFACT · Backend Engineer` — threads/backend-findings.md written, N findings
- `E-NNN · ARTIFACT · Frontend Engineer` — threads/web-findings.md written, N findings
- `E-NNN · ARTIFACT · Mobile Engineer` — threads/mobile-findings.md written, N findings
- `E-NNN · ARTIFACT · SRE` — ops.md v1 produced
- `E-NNN · ARTIFACT · QA` — test-cases.md v1 produced
Then log Tech Lead's synthesis:
- `D-NNN · DECISION · Tech Lead` — implementation option chosen (options A/B/C, rationale, downstream impact)
- `E-NNN · ARTIFACT · Tech Lead` — implementation-options.md v1 written

**Step 2c: Engineering BR loop**

For each artifact (`implementation-options.md`, `ops.md`, `test-cases.md`):
```
round = 1
loop:
  TPM writes: .brocode/<id>/instructions/eng-br-round<round>-<artifact>.md
  Print: 📋 TPM → instruction written: instructions/eng-br-round<round>-<artifact>.md
  TPM logs: E-NNN · DISPATCH · Engineering BR  (round <round>, artifact: <artifact>)

  Dispatch Engineering BR sub-agent (fresh context):
    - reads this artifact + all other eng artifacts (cross-consistency check)
    - reads all prior challenge files for this artifact
    - reads agents/engineering-bar-raiser.md + its instruction file
    - either: writes br/engineering/<N>-<artifact>-challenge-round<round>.md
    - or:     writes br/engineering/<N>-<artifact>-approved.md → BREAK loop

  if challenged:
    print: ⚠️  ⚖️ Eng BR  →  [N challenges on <artifact>] (round <round>)
    TPM logs: E-NNN · CHALLENGE · Engineering BR  (round <round>)  — list each challenge title
    dispatch Tech Lead sub-agent (fresh context) with instruction file containing:
      - the specific BR challenge items
      - which sub-agent to re-dispatch internally (SRE for ops.md challenges, QA for test-cases.md challenges, Backend/Frontend/Mobile for impl challenges)
      - Tech Lead routes to sub-agent → sub-agent revises artifact → Tech Lead synthesizes → writes response
    TPM logs: D-NNN per choice made during revision (what changed and why)
    TPM logs: E-NNN · REVISE · Tech Lead  — what changed, reference D-NNN entries
    print: 🟢  Tech Lead  →  revised <artifact> v<round+1>
    round += 1

  if approved:
    TPM logs: E-NNN · APPROVE · Engineering BR  — artifact + version approved

  if round > <engineering_rounds>:
    print: 🚫  ⚖️ Eng BR  →  ESCALATE: unresolved after <engineering_rounds> rounds on <artifact>
    TPM logs: E-NNN · ESCALATE · TPM  — full <engineering_rounds>-round history, unresolved gap, question for user
    surface exact unresolved challenge to user
    wait for user answer before continuing
    break
```

**Step 2d: Tech Lead writes final spec**
After `implementation-options.md` + `ops.md` + `test-cases.md` all approved:

TPM writes `.brocode/<id>/instructions/tech-lead-final-spec.md`:
```
# Instruction: Tech Lead — write final spec (spec mode)
Run ID: <id>
Your agent file: agents/tech-lead.md
What to do: Read all approved artifacts. Write engineering-spec.md (RFC format —
  title, status, context, decision, consequences, implementation plan, open questions).
  Write tasks.md (domain-scoped task list — one section per domain, clear ACs per task,
  ordered by dependency).
Files to read: .brocode/<id>/product-spec.md,
               .brocode/<id>/implementation-options.md, .brocode/<id>/ops.md,
               .brocode/<id>/test-cases.md, all br/engineering/*-approved.md
Files to write: .brocode/<id>/engineering-spec.md, .brocode/<id>/tasks.md
Constraints: Sole producer. Engineering BR will final-check after. Self-contained RFC.
```
Print: `🤝 Tech Lead → writing engineering-spec.md + tasks.md`
TPM logs: `E-NNN · DISPATCH · Tech Lead` — writing final spec + tasks from approved artifacts
Dispatch Tech Lead sub-agent (fresh context).
TPM logs (after artifacts written):
- `E-NNN · ARTIFACT · Tech Lead` — engineering-spec.md v1 written
- `E-NNN · ARTIFACT · Tech Lead` — tasks.md v1 written, N tasks across N domains

Engineering BR does final check on `engineering-spec.md` + `tasks.md` (max <final_check_rounds> rounds).
TPM logs for final BR check: `E-NNN · DISPATCH · Engineering BR` + `E-NNN · APPROVE · Engineering BR` per artifact
Print after approval: `✅ Eng BR → engineering-spec.md + tasks.md APPROVED`
Print: `📊 TPM → writing brocode.md retrospective`
Write `.brocode/<id>/brocode.md` (see Post-Run section in `agents/tpm.md` for format).
Run ADR extraction (see ADR Extraction Procedure above).
Print: `📋 TPM → [N] ADRs written to .brocode/<id>/adrs/`
TPM logs: `E-NNN · ARTIFACT · TPM` — adrs/ written, N decisions exported
TPM logs: `E-NNN · COMPLETE · TPM` — run complete, list all produced artifacts + decision index (all D-NNN refs)

### Iron laws
1. Product BR must approve before engineering starts
2. Tech Lead is sole producer of `engineering-spec.md` and `tasks.md`
3. Engineering BR challenges but never writes the spec
4. Max <engineering_rounds> BR rounds per artifact — escalate to user if unresolved
5. No agent edits another agent's artifact

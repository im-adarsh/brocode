# brocode: investigate mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: bug / crash / error / broken -->

## Step 2: INVESTIGATE flow

### Pre-flight
1. Generate ID: `inv-YYYYMMDD-<slug>`
2. Create `.brocode/<id>/`, `.brocode/<id>/threads/`, `.brocode/<id>/br/engineering/`, `.brocode/<id>/instructions/`
3. Write `.brocode/<id>/brief.md` from user input
4. Read `~/.brocode/repos.json` for repo paths
5. TPM logs:
   - `E-NNN · DISPATCH · TPM` — run started, ID assigned
   - `E-NNN · ARTIFACT · TPM` — brief.md written from user input
6. TodoWrite: initialize run todo list — all items `pending`:
   - `📋 TPM → brief.md written` (mark `completed` immediately)
   - `🤝 Tech Lead → triage`
   - `🤝 Tech Lead → dispatching team`
   - `⚙️ Engineers → parallel investigation`
   - `🤝 Tech Lead → investigation.md`
   - `⚖️ Engineering BR → review`
   - `🤝 Tech Lead → final spec + tasks`
   - `⚖️ Engineering BR → final check`
   - `📋 TPM → ADR extraction + brocode.md`

### Org
```
TPM (you) — orchestrator, logs all transitions, writes instruction files before every dispatch
└── Engineering Track
    ├── Tech Lead sub-agent — dispatches engineer sub-agents, synthesizes, writes final spec + tasks
    │   ├── Backend Engineer sub-agent (scope-based, parallel)
    │   ├── Frontend Engineer sub-agent (scope-based, parallel)
    │   ├── Mobile Engineer sub-agent (scope-based, parallel)
    │   ├── SRE sub-agent (parallel — ops + blast radius + infra)
    │   └── QA sub-agent (parallel — failing test + test surface)
    └── Engineering Bar Raiser sub-agent (fresh context per round — challenges only, never writes spec)
```

### Instruction file protocol
Before dispatching any sub-agent, TPM writes an instruction file to `.brocode/<id>/instructions/<role>-<phase>.md`:
```
# Instruction: <role> — <phase>
Run ID: <id>
Your agent file: agents/<agent-file>.md
What to do: <specific task, concrete>
Files to read: <explicit list of paths>
File to write: <exact output path>
Threads: <thread files to create/append, if applicable>
Thread reading rule: For any thread file > 50 lines, read the `## Summary` section only
  unless you are doing a revision or the Summary says "open question: [your domain]".
  Full thread content preserved below summary for audit.
Constraints: <hard rules>
```
Print immediately after writing:
`📋 TPM → instruction written: instructions/<role>-<phase>.md`

### Phase 1: Tech Lead triage + clarifying questions

TPM writes `.brocode/<id>/instructions/tech-lead-triage.md`:
```
# Instruction: Tech Lead — triage
Run ID: <id>
Your agent file: agents/tech-lead.md
What to do:
  1. Read brief.md in full.
  2. Identify any ambiguities that would block investigation — missing reproduction steps,
     unclear scope, unknown domain, missing environment info.
  3. Write clarifying questions to threads/tech-lead-brief-questions.md.
     Format: [Tech Lead → TPM]: <question>
  4. Once satisfied (or no questions), signal ready: write threads/tech-lead-ready.md
     with confirmed domain scope (Backend / Frontend / Mobile / cross-domain) and key constraints.
Files to read: .brocode/<id>/brief.md
Threads: .brocode/<id>/threads/tech-lead-brief-questions.md
Constraints: Ask before delegating — do not dispatch team until scope confirmed.
```
Print: `🤝 Tech Lead → triaging brief, may ask clarifying questions`
Dispatch Tech Lead sub-agent. If questions arise, TPM surfaces them to user, gets answers, appends to thread, re-checks with Tech Lead.
Print when ready: `🤝 Tech Lead → scope confirmed, dispatching team`

Print: `📦 TPM → compacting context before Tech Lead dispatch`
Run: `/compact`

TPM writes `.brocode/<id>/instructions/tech-lead-investigate.md`:
```
# Instruction: Tech Lead — investigate
Run ID: <id>
Your agent file: agents/tech-lead.md
What to do:
  1. Read ~/.brocode/wiki/index.md — understand full system topology.
  2. Read threads/tech-lead-ready.md for confirmed domain scope.
  3. Write instruction files for each relevant engineer sub-agent, plus SRE and QA.
  4. Dispatch all in parallel. Each scans knowledge base first, then reads repos.
  5. Read all findings from threads/. Synthesize into investigation.md.
  6. After all artifacts BR-approved, write engineering-spec.md + tasks.md.
Files to read: .brocode/<id>/brief.md, .brocode/<id>/threads/tech-lead-ready.md,
               ~/.brocode/repos.json, ~/.brocode/wiki/index.md
Files to write: .brocode/<id>/investigation.md (then later) .brocode/<id>/engineering-spec.md, .brocode/<id>/tasks.md
Constraints:
  - No fix without confirmed root cause
  - No fix without failing test case
  - You are the sole producer of engineering-spec.md and tasks.md
  - Engineering BR challenges but never writes the spec
  - You are the sole interface to Engineering BR — SRE and QA never talk to BR directly
```
Print: `🤝 Tech Lead → dispatching team`
Dispatch Tech Lead sub-agent (reads `agents/tech-lead.md` + its instruction file).

Tech Lead internally writes instruction files for each engineer before dispatching:
- `.brocode/<id>/instructions/backend-investigate.md`
- `.brocode/<id>/instructions/frontend-investigate.md` (if web layer involved)
- `.brocode/<id>/instructions/mobile-investigate.md` (if mobile involved)
- `.brocode/<id>/instructions/sre-investigate.md`
- `.brocode/<id>/instructions/qa-investigate.md`

Each instruction tells the sub-agent:
- What domain repos to read (from `~/.brocode/repos.json`)
- Where to find the knowledge base (`~/.brocode/wiki/<repo-slug>/`)
- What thread files to write findings to (`threads/<topic>.md` — descriptive names, one per topic)
- When to invoke `superpowers:systematic-debugging` (2 hypotheses eliminated, intermittent bug, 3+ layers, contradictory symptoms)
- SRE instruction: include only `brief.md` blast-radius section + relevant domain thread files. Do NOT include product-spec.md — not applicable in investigate mode.
- QA instruction: include only `brief.md` acceptance-criteria section + relevant domain thread files. Do NOT include product-spec.md — not applicable in investigate mode.
- Backend / Frontend / Mobile instructions: include only their domain section of `brief.md` + their domain's thread files + `~/.brocode/wiki/<their-repo-slug>/` only.

TPM logs one entry per sub-agent dispatched (do not batch):
- `E-NNN · DISPATCH · Backend Engineer` — instruction file path
- `E-NNN · DISPATCH · Frontend Engineer` — instruction file path (if in scope)
- `E-NNN · DISPATCH · Mobile Engineer` — instruction file path (if in scope)
- `E-NNN · DISPATCH · SRE` — instruction file path
- `E-NNN · DISPATCH · QA` — instruction file path

As each sub-agent produces findings, TPM logs one entry per agent (as they complete, not all at once):
- `E-NNN · THREAD-OPEN · [sub-agent]` — per thread file the sub-agent creates
- `E-NNN · ARTIFACT · SRE` — ops.md v1 produced
- `E-NNN · ARTIFACT · QA` — test-cases.md v1 produced

Print: `📦 TPM → compacting context before Engineering BR loop`
Run: `/compact`

### Phase 2: Engineering BR loop

For each artifact (`investigation.md`, `ops.md`, `test-cases.md`):

```
round = 1
loop:
  TPM writes: .brocode/<id>/instructions/eng-br-round<round>-<artifact>.md
  Print: 📋 TPM → instruction written: instructions/eng-br-round<round>-<artifact>.md
  TPM logs: E-NNN · DISPATCH · Engineering BR  (round <round>, artifact: <artifact>)

  Dispatch Engineering BR sub-agent (fresh context):
    - reads artifact + all prior challenge files for this artifact
    - reads agents/engineering-bar-raiser.md + its instruction file
    - either: writes br/engineering/<N>-<artifact>-challenge-round<round>.md
    - or:     writes br/engineering/<N>-<artifact>-approved.md → BREAK loop

  if challenged:
    print: ⚠️  ⚖️ Eng BR  →  [N challenges on <artifact>] (round <round>)
    TPM logs: E-NNN · CHALLENGE · Engineering BR  (round <round>)  — list each challenge title
    dispatch Tech Lead sub-agent (fresh context) with instruction file containing:
      - the specific BR challenge items
      - which sub-agent to re-dispatch internally (SRE for ops.md, QA for test-cases.md, domain engineers for investigation.md)
      - Tech Lead routes to sub-agent → sub-agent revises artifact → Tech Lead synthesizes → writes response
    TPM logs: D-NNN per choice made during revision (what changed and why)
    TPM logs: E-NNN · REVISE · Tech Lead  — what changed, reference D-NNN entries
    print: 🟢  Tech Lead  →  revised <artifact> v<round+1>
    round += 1

  if approved:
    TPM logs: E-NNN · APPROVE · Engineering BR  — artifact + version approved

  if round > <engineering_rounds>:
    print: 🚫  ⚖️ Eng BR  →  ESCALATE: unresolved after 3 rounds on <artifact>
    TPM logs: E-NNN · ESCALATE · TPM  — full 3-round history, unresolved gap, question for user
    surface exact unresolved challenge to user
    wait for user answer before continuing
    break
```

When `investigation.md` + `ops.md` + `test-cases.md` all approved:

Print: `📦 TPM → compacting context before final spec`
Run: `/compact`

**Write `.brocode/<id>/evidence.md`:**

Tech Lead writes this file immediately after investigation phase completes (before writing engineering-spec.md):

```markdown
# Evidence Log
**Run ID:** [id]

## Reproduction
[Exact steps, commands, environment state used to reproduce the bug]
[Reproducibility: always / flaky N% / condition X]

## Logs / Stack Traces
[Verbatim output — no paraphrasing]

## Timeline
| Time | Event |
|------|-------|
| [HH:MM] | [what happened] |

## Hypotheses Ruled Out
| Hypothesis | Why ruled out | Evidence |
|-----------|--------------|---------|
```

TPM logs: `E-NNN · ARTIFACT · Tech Lead` — evidence.md written

TPM writes `.brocode/<id>/instructions/tech-lead-final-spec.md`:
```
# Instruction: Tech Lead — write final spec
Run ID: <id>
Your agent file: agents/tech-lead.md
What to do: Read all approved artifacts. Write engineering-spec.md (RFC format,
  fully self-contained — context, decision, consequences, implementation plan).
  Write tasks.md (domain-scoped task list, clear ACs per task).
Files to read: .brocode/<id>/investigation.md, .brocode/<id>/ops.md,
               .brocode/<id>/test-cases.md, all br/engineering/*-approved.md
Files to write: .brocode/<id>/engineering-spec.md, .brocode/<id>/tasks.md
Constraints: You are the sole producer. Engineering BR will do a final check after.
```
Print: `🤝 Tech Lead → writing engineering-spec.md + tasks.md`
TPM logs: `E-NNN · DISPATCH · Tech Lead` — writing final spec + tasks from approved artifacts
Dispatch Tech Lead sub-agent (fresh context).
TPM logs (after artifacts written):
- `E-NNN · ARTIFACT · Tech Lead` — engineering-spec.md v1 written
- `E-NNN · ARTIFACT · Tech Lead` — tasks.md v1 written, N tasks across N domains

Engineering BR does final check on `engineering-spec.md` + `tasks.md` (max <final_check_rounds> rounds).
TPM logs for final BR check: `E-NNN · DISPATCH · Engineering BR` + `E-NNN · APPROVE · Engineering BR` per artifact
Print: `✅ Eng BR → engineering-spec.md + tasks.md APPROVED`
Print: `📊 TPM → writing brocode.md retrospective`
Write `.brocode/<id>/brocode.md` (see Post-Run section in `agents/tpm.md` for format).
Run ADR extraction (see ADR Extraction Procedure above).
Print: `📋 TPM → [N] ADRs written to .brocode/<id>/adrs/`
TPM logs: `E-NNN · ARTIFACT · TPM` — adrs/ written, N decisions exported
TPM logs: `E-NNN · COMPLETE · TPM` — run complete, list all produced artifacts + decision index (all D-NNN refs)

### Iron laws
1. No fix proposed without confirmed root cause
2. No fix approved without failing test case
3. Engineering BR challenges but never writes the spec
4. No parallel agents editing the same file
5. Tech Lead is sole producer of `engineering-spec.md` and `tasks.md`

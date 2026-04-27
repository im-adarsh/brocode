# brocode v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite brocode to use true sub-agent-per-role dispatch, a persistent wiki-style knowledge base, Tech Lead ownership of engineering-spec + tasks, and live TPM event logging with post-run retrospective.

**Architecture:** TPM writes instruction files before each agent dispatch. Every agent is a fresh isolated sub-agent that reads its instruction file + agent file + relevant artifacts. Agents communicate only through files. Knowledge base at `~/.brocode/wiki/` compounds over time — engineer sub-agents scan repos on first visit and cache findings.

**Tech Stack:** Markdown agent files, Claude Code plugin system, bash (ls, cat, mkdir), `~/.brocode/` user-level storage, superpowers skills (systematic-debugging, using-git-worktrees, writing-plans, subagent-driven-development, finishing-a-development-branch, code-review)

---

## Files to create or modify

| Action | File | Purpose |
|--------|------|---------|
| Modify | `commands/brocode.md` | Full rewrite — instruction protocol, new flows, knowledge base integration, Tech Lead as spec producer |
| Modify | `agents/tpm.md` | Live event printing, instruction file writing, brocode.md retrospective |
| Modify | `agents/tech-lead.md` | Sub-agent dispatch via instruction files, knowledge base read, owns engineering-spec + tasks |
| Modify | `agents/swe-backend.md` | Knowledge base scan protocol, instruction file reading, superpowers:systematic-debugging |
| Modify | `agents/swe-frontend.md` | Same as backend |
| Modify | `agents/swe-mobile.md` | Same as backend |
| Modify | `agents/sre.md` | Instruction file reading, combined ops + platform/infra role |
| Modify | `agents/qa.md` | Instruction file reading, reports to Tech Lead |
| Modify | `agents/pm.md` | Instruction file reading |
| Modify | `agents/designer.md` | Instruction file reading |
| Modify | `agents/product-bar-raiser.md` | Instruction file reading, fresh sub-agent per round |
| Modify | `agents/engineering-bar-raiser.md` | Instruction file reading, fresh sub-agent per round, never writes spec |
| Delete | `agents/staff-eng.md` | Role removed — knowledge base replaces architectural memory |
| Modify | `CLAUDE.md` | Update flow summaries, remove Staff SWE from all remaining refs in command |
| Modify | `README.md` | Update context dir to include instructions/ and brocode.md |
| Modify | `docs/index.html` | Update context tree mermaid, update agent descriptions |

---

## Task 1: Rewrite `commands/brocode.md` — instruction protocol + INVESTIGATE flow

**Files:**
- Modify: `commands/brocode.md` (lines 150–230, INVESTIGATE flow)

- [ ] **Step 1: Read current brocode.md**

```bash
cat commands/brocode.md
```

- [ ] **Step 2: Replace INVESTIGATE flow org chart and phases**

In `commands/brocode.md`, replace the INVESTIGATE flow org chart (the ```TPM (you)...``` block) and phases 1–3 with:

```markdown
## Step 2: INVESTIGATE flow

### Pre-flight
1. Generate ID: `inv-YYYYMMDD-<slug>`
2. Create `.brocode/<id>/`, `.brocode/<id>/threads/`, `.brocode/<id>/br/engineering/`, `.brocode/<id>/instructions/`
3. Write `.brocode/<id>/brief.md` from user input
4. Read `~/.brocode/repos.json` for repo paths

### Org
```
TPM (you) — orchestrator, logs all transitions, writes instruction files
└── Engineering Track
    ├── Tech Lead sub-agent — dispatches engineer sub-agents, synthesizes, writes final spec + tasks
    │   ├── Backend Engineer sub-agent (scope-based, parallel)
    │   ├── Frontend Engineer sub-agent (scope-based, parallel)
    │   ├── Mobile Engineer sub-agent (scope-based, parallel)
    │   ├── SRE sub-agent (parallel — ops + blast radius + infra)
    │   └── QA sub-agent (parallel — test surface + failing test)
    └── Engineering Bar Raiser sub-agent (fresh context per round — challenges only, never writes spec)
```

### Instruction file protocol
Before dispatching any sub-agent, TPM writes an instruction file to `.brocode/<id>/instructions/<role>-<phase>.md`:
```
# Instruction: <role> — <phase>
Run ID: <id>
Your agent file: agents/<role>.md
What to do: <specific task>
Files to read: <list>
File to write: <path> (append-only if thread)
Constraints: <any>
```
Print: `📋 TPM → instruction written: instructions/<role>-<phase>.md`

### Phase 1: Tech Lead dispatch
TPM writes `instructions/tech-lead-investigate.md`:
```
# Instruction: Tech Lead — investigate
Run ID: <id>
Your agent file: agents/tech-lead.md
What to do: Triage domain from brief.md. Dispatch Backend/Frontend/Mobile sub-agents
  (scope-based, parallel). Each sub-agent scans knowledge base first, then reads repos.
  Dispatch SRE in parallel for blast radius. Dispatch QA in parallel for failing test.
  Synthesize all findings. Write investigation.md.
  Then write engineering-spec.md and tasks.md from all approved artifacts.
Files to read: .brocode/<id>/brief.md, ~/.brocode/repos.json, ~/.brocode/wiki/index.md
File to write: .brocode/<id>/investigation.md, .brocode/<id>/engineering-spec.md, .brocode/<id>/tasks.md
Constraints: No fix without confirmed root cause. No fix without failing test.
```
Print: `🤝 Tech Lead → dispatched`
Dispatch Tech Lead sub-agent (reads agents/tech-lead.md + its instruction file).

Tech Lead internally writes instruction files for each engineer before dispatching:
- `instructions/backend-investigate.md`
- `instructions/frontend-investigate.md` (if web-layer involved)
- `instructions/mobile-investigate.md` (if mobile involved)
- `instructions/sre-investigate.md`
- `instructions/qa-investigate.md`

### Phase 2: Engineering BR loop

For each artifact (`investigation.md`, `ops.md`, `test-cases.md`):

```
round = 1
loop:
  TPM writes instruction: instructions/eng-br-round<round>-<artifact>.md
  Dispatch Engineering BR sub-agent (fresh context):
    - reads artifact + all prior challenge files for this artifact
    - reads agents/engineering-bar-raiser.md + its instruction file
    - either: writes br/engineering/<N>-<artifact>-challenge-round<round>.md
    - or:     writes br/engineering/<N>-<artifact>-approved.md → BREAK

  if challenged:
    print: ⚠️  ⚖️ Eng BR  →  [N challenges on <artifact>] (round <round>)
    dispatch producer sub-agent (fresh context, reads challenge + artifact + agent file):
      revises artifact (appends ## Changes from BR Challenge round <round>)
    print: 🟢  [producer]  →  revised <artifact> v<round+1>
    round += 1

  if round > 3:
    print: 🚫  ⚖️ Eng BR  →  ESCALATE: unresolved after 3 rounds on <artifact>
    surface exact unresolved challenge to user
    wait for user answer before continuing
    break
```

When investigation.md + ops.md + test-cases.md all approved:
- Tech Lead sub-agent (fresh, reads all approved artifacts + instruction) writes `engineering-spec.md` + `tasks.md`
- Engineering BR does final check on engineering-spec.md (max 2 rounds)
- Print: `✅ Tech Lead → engineering-spec.md + tasks.md written`

### Iron laws
1. No fix without confirmed root cause
2. No fix without failing test case
3. Engineering BR challenges but never writes the spec
4. No parallel agents editing the same file
5. Tech Lead is sole producer of engineering-spec.md and tasks.md
```

- [ ] **Step 3: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: rewrite INVESTIGATE flow — instruction protocol, sub-agent dispatch, Tech Lead owns spec"
```

---

## Task 2: Rewrite `commands/brocode.md` — SPEC flow

**Files:**
- Modify: `commands/brocode.md` (lines 233–380, SPEC flow)

- [ ] **Step 1: Replace SPEC flow org chart and phases**

In `commands/brocode.md`, replace the SPEC flow org chart and phases 1–2 with:

```markdown
## Step 3: SPEC flow

### Pre-flight
1. Generate ID: `spec-YYYYMMDD-<slug>`
2. Create `.brocode/<id>/`, `.brocode/<id>/threads/`, `.brocode/<id>/br/product/`, `.brocode/<id>/br/engineering/`, `.brocode/<id>/instructions/`
3. Handle external input: if URL/doc attached, fetch content. If image, describe it.
4. Write `.brocode/<id>/brief.md`
5. Read `~/.brocode/repos.json` for repo paths

### Org
```
TPM (you) — orchestrator, logs all transitions, writes instruction files
├── Product Track (gates engineering)
│   ├── PM sub-agent — requirements, personas, journeys, ACs
│   ├── Designer sub-agent — UX flows, screen states, e2e mermaid
│   └── Product BR sub-agent (fresh per round) — challenges both, gates engineering
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
TPM writes `instructions/pm-phase1.md`:
```
# Instruction: PM — phase 1
Your agent file: agents/pm.md
What to do: Read brief.md. Converse with Designer via threads/<topic>.md. Produce product-spec.md.
Files to read: .brocode/<id>/brief.md
File to write: .brocode/<id>/product-spec.md
Threads: create .brocode/<id>/threads/<topic>.md for each discussion topic with Designer
```
Print: `🎯 PM → dispatched`
Dispatch PM sub-agent.

**Step 1b: Designer** (after PM writes product-spec.md)
TPM writes `instructions/designer-phase1.md`:
```
# Instruction: Designer — phase 1
Your agent file: agents/designer.md
What to do: Read product-spec.md. Converse with PM via threads. Produce ux.md.
Files to read: .brocode/<id>/product-spec.md, .brocode/<id>/threads/
File to write: .brocode/<id>/ux.md
```
Print: `🎨 Designer → dispatched`
Dispatch Designer sub-agent.

**Step 1c: Product BR loop**

For each artifact (`product-spec.md`, `ux.md`):
```
round = 1
loop:
  TPM writes instruction: instructions/product-br-round<round>-<artifact>.md
  Dispatch Product BR sub-agent (fresh context):
    - reads artifact + all prior challenge files
    - reads agents/product-bar-raiser.md + its instruction
    - uses web search when competitors referenced
    - either: writes br/product/<N>-<artifact>-challenge-round<round>.md
    - or:     writes br/product/<N>-<artifact>-approved.md → BREAK

  if challenged:
    print: ⚠️  🔬 Product BR  →  [N challenges on <artifact>] (round <round>)
    dispatch producer sub-agent (PM or Designer, fresh context):
      revises artifact (appends ## Changes from Product BR Challenge round <round>)
      notifies other agent if change affects their artifact
    print: 🟢  [producer]  →  revised <artifact> v<round+1>
    round += 1

  if round > 3: escalate to user, wait, break
```

When both approved: write `br/product/gate-approved.md`.
Print: `🔓 TPM → [D-NNN] product gate OPEN — engineering starts`

**Engineering track does NOT start until Product BR gate is approved.**

### Phase 2 — Engineering Track

**Step 2a: Tech Lead**
TPM writes `instructions/tech-lead-phase2.md`:
```
# Instruction: Tech Lead — phase 2
Your agent file: agents/tech-lead.md
What to do:
  1. Read ~/.brocode/wiki/index.md — understand full system topology.
  2. Write instruction files for Backend, Frontend, Mobile, SRE, QA sub-agents.
  3. Dispatch all 5 in parallel. Each scans knowledge base first, then reads repos.
  4. Read all findings from threads/. Synthesize into implementation-options.md (3 options).
  5. After all artifacts BR-approved, write engineering-spec.md + tasks.md.
Files to read: .brocode/<id>/product-spec.md, .brocode/<id>/ux.md,
               ~/.brocode/repos.json, ~/.brocode/wiki/index.md
Files to write: .brocode/<id>/implementation-options.md,
                .brocode/<id>/engineering-spec.md, .brocode/<id>/tasks.md
```
Print: `🤝 Tech Lead → dispatched`
Dispatch Tech Lead sub-agent.

Tech Lead internally dispatches (each gets its own instruction file):
- Backend, Frontend, Mobile, SRE, QA — all parallel
- Each reads: own instruction + agent file + knowledge base + repos
- Each writes findings to threads/<topic>.md

**Step 2b: SRE + QA** (dispatched by Tech Lead, parallel)
- SRE: reads approved artifacts → produces `ops.md`
- QA: reads approved artifacts → produces `test-cases.md`
- Both append to threads/<topic>.md when questions arise

**Step 2c: Engineering BR loop**

For each artifact (`implementation-options.md`, `ops.md`, `test-cases.md`):
```
round = 1
loop:
  TPM writes instruction: instructions/eng-br-round<round>-<artifact>.md
  Dispatch Engineering BR sub-agent (fresh context):
    - reads this artifact + all other eng artifacts (cross-consistency check)
    - reads agents/engineering-bar-raiser.md + its instruction
    - either: writes br/engineering/<N>-<artifact>-challenge-round<round>.md
    - or:     writes br/engineering/<N>-<artifact>-approved.md → BREAK

  if challenged:
    print: ⚠️  ⚖️ Eng BR  →  [N challenges on <artifact>] (round <round>)
    dispatch producer (Tech Lead / SRE / QA, fresh context):
      revises artifact
    round += 1

  if round > 3: escalate, wait, break
```

**Step 2d: Tech Lead writes final spec**
After all three artifacts approved:
TPM writes `instructions/tech-lead-final-spec.md`:
```
# Instruction: Tech Lead — write final spec
What to do: Read all approved artifacts. Write engineering-spec.md (RFC format,
  fully self-contained). Write tasks.md (domain-scoped task list per domain).
Files to read: all approved artifacts in .brocode/<id>/
Files to write: .brocode/<id>/engineering-spec.md, .brocode/<id>/tasks.md
```
Dispatch Tech Lead sub-agent (fresh context).
Print: `🤝 Tech Lead → writing engineering-spec.md + tasks.md`

Engineering BR does final check on engineering-spec.md + tasks.md (max 2 rounds).
Print: `✅ Eng BR → engineering-spec.md APPROVED`
```

- [ ] **Step 2: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: rewrite SPEC flow — instruction protocol, Tech Lead owns engineering-spec + tasks"
```

---

## Task 3: Update `agents/tpm.md` — live event printing + brocode.md retrospective

**Files:**
- Modify: `agents/tpm.md`

- [ ] **Step 1: Read current tpm.md**

```bash
cat agents/tpm.md
```

- [ ] **Step 2: Add instruction file writing protocol**

Add this section to tpm.md after the role description:

```markdown
## Instruction File Protocol

Before dispatching ANY sub-agent, write an instruction file to `.brocode/<id>/instructions/<role>-<phase>.md`:

```markdown
# Instruction: <role> — <phase>
Run ID: <id>
Your agent file: agents/<agent-file>.md
What to do: <specific task, concrete>
Files to read: <explicit list of paths>
File to write: <exact output path>
Threads: <thread files to create/append if applicable>
Constraints: <hard rules>
```

Print immediately after writing:
`📋 TPM → instruction written: instructions/<role>-<phase>.md`
```

- [ ] **Step 3: Add live event printing rules**

Add this section to tpm.md:

```markdown
## Live Event Printing

Print one line to terminal at every transition. Format:

```
<emoji>  <Agent>       →  <what is happening>
```

| Situation | Format |
|-----------|--------|
| Agent dispatched | `🎯 PM → dispatched` |
| Agent writing artifact | `🎯 PM → writing product-spec.md` |
| Agent done | `✅ PM → product-spec.md v1 written` |
| Thread opened | `🎯 PM ↔️ 🎨 DS → thread: "empty state question"` |
| BR challenge | `⚠️ Product BR → CHALLENGED product-spec.md (round 1)` |
| BR approved | `✅ Product BR → product-spec.md APPROVED` |
| Gate open | `🔓 TPM → [D-NNN] product gate OPEN` |
| Parallel agents | `⚙️ Backend → scanning repos [parallel]` |
| Cross-agent convo | `⚙️ Backend ↔️ 🖥️ Frontend → thread: "api contract"` |
| Escalate | `🚫 Eng BR → ESCALATE: unresolved round 3 on ops.md` |
| Done | `✅ TPM → DONE — <id> complete (<N> min)` |

Print BEFORE dispatch (shows intent) and AFTER artifact written (shows completion).
```

- [ ] **Step 4: Add brocode.md retrospective writing**

Add this section to tpm.md:

```markdown
## Post-Run: brocode.md Retrospective

After run completes (all artifacts approved, final spec written), write `.brocode/<id>/brocode.md`:

```markdown
# brocode run: <id>
Date: <YYYY-MM-DD>  Duration: <N> min  Mode: Spec | Investigate | Develop | Review

## What happened
- List each phase, how many BR rounds, key threads opened, key decisions made
- Reference D-NNN decisions from tpm-logs.md

## What went well
- Fast convergences (e.g. PM+Designer agreed in 1 thread)
- Good catches (e.g. SRE flagged EU region impact early)
- Thorough analysis areas

## What could be better
- BR context drift (same issue raised twice)
- Thin coverage (e.g. no mobile repo registered — analysis was theoretical)
- Slow phases (e.g. round 3 escalated — root cause)

## Suggestions
- Actionable improvements (e.g. "Register mobile repo: /brocode:brocode repos")
- Template gaps (e.g. "Add ops-interface AC to PM template")
```

Print: `📊 TPM → writing brocode.md retrospective`
```

- [ ] **Step 5: Commit**

```bash
git add agents/tpm.md
git commit -m "feat: TPM — instruction file protocol, live event printing, brocode.md retrospective"
```

---

## Task 4: Update `agents/tech-lead.md` — sub-agent dispatch + knowledge base + owns spec

**Files:**
- Modify: `agents/tech-lead.md`

- [ ] **Step 1: Read current tech-lead.md**

```bash
cat agents/tech-lead.md
```

- [ ] **Step 2: Replace orchestration protocol with instruction-file-based dispatch**

Replace the "Orchestration Protocol" section with:

```markdown
## Orchestration Protocol

### Step 0: Read your instruction file
Read `.brocode/<id>/instructions/tech-lead-<phase>.md` first. It specifies exactly what to do, what to read, and what to write.

### Step 1: Read knowledge base
Read `~/.brocode/wiki/index.md` — understand full system topology before dispatching.
If wiki is empty or stale for a domain, note it — engineer sub-agents will scan on dispatch.

### Step 2: Write instruction files for your team
Before dispatching each engineer, write their instruction file to `.brocode/<id>/instructions/<role>-<phase>.md`.

Include:
- Exact files to read (repos from ~/.brocode/repos.json for their domain, brief.md, product-spec.md, ux.md)
- Knowledge base path: `~/.brocode/wiki/<repo-slug>/`
- Output: append findings to `threads/<topic>.md` (create topic file per discussion)
- Trigger for superpowers:systematic-debugging: if investigation stalls (2 hypotheses eliminated, intermittent, contradictory symptoms)

### Step 3: Dispatch engineers in parallel (scope-based)
- Scope determines which engineers: backend-only, frontend-only, mobile, or multiple
- SRE always runs in parallel
- QA always runs in parallel
- Print one line per dispatch: `⚙️ Backend → scanning repos + knowledge base [parallel]`

### Step 4: Synthesize findings
Read all thread files. Synthesize into implementation-options.md (3 options with real code sketches, tradeoffs, recommendation).

### Step 5 (after all BR approvals): Write engineering-spec.md + tasks.md
You are the sole producer of the final spec and tasks. Engineering BR challenges your output but never writes it.

engineering-spec.md format: RFC — title, status, context, decision, consequences, implementation notes, open questions
tasks.md format: domain-scoped task list with clear acceptance criteria per task
```

- [ ] **Step 3: Add rule — Tech Lead owns final artifacts**

Add to the "Iron Laws" or rules section:

```markdown
## Ownership Rules
- You write engineering-spec.md and tasks.md — no other agent does
- Engineering BR challenges your spec — you revise, they approve
- Append `## Changes from BR Challenge round <N>` when revising
- Never edit another agent's artifact (ops.md, test-cases.md, product-spec.md, ux.md)
```

- [ ] **Step 4: Remove Staff SWE references**

Delete all mentions of `staff-eng.md`, Staff SWE convergence, and `architecture.md` from tech-lead.md.

- [ ] **Step 5: Commit**

```bash
git add agents/tech-lead.md
git commit -m "feat: Tech Lead — instruction-file dispatch, knowledge base read, owns engineering-spec + tasks"
```

---

## Task 5: Update engineer sub-agents — knowledge base scan protocol

**Files:**
- Modify: `agents/swe-backend.md`, `agents/swe-frontend.md`, `agents/swe-mobile.md`

- [ ] **Step 1: Read current engineer agent files**

```bash
cat agents/swe-backend.md
cat agents/swe-frontend.md
cat agents/swe-mobile.md
```

- [ ] **Step 2: Add knowledge base scan protocol to each**

Add this section to the top of each engineer agent file (after role description):

```markdown
## Step 0: Read your instruction file
Read `.brocode/<id>/instructions/<your-role>-<phase>.md` first. It specifies what repos to read, what to write, and what constraints apply.

## Step 1: Knowledge base scan (before any analysis)

1. Read `~/.brocode/wiki/log.md`
   - If your repo slug appears with `scanned_at` < 7 days ago → read cached wiki pages, skip scan
   - Otherwise → run scan:

2. For each repo in `~/.brocode/repos.json` for your domain:
   ```bash
   ls <repo-path>                              # detect monorepo vs single-service
   cat <repo-path>/CLAUDE.md                   # conventions, patterns, decisions
   cat <repo-path>/package.json                # or go.mod / pubspec.yaml / Gemfile
   ls <repo-path>/.github/workflows/           # CI config
   ls <repo-path>/packages/ || ls <repo-path>/apps/ || ls <repo-path>/services/  # monorepo check
   ```

3. Write to `~/.brocode/wiki/<repo-slug>/`:
   - `overview.md` — repo pattern (monorepo/single-service), stack, structure summary, CI
   - `patterns.md` — directory layout, service boundaries, naming conventions
   - `conventions.md` — extracted from CLAUDE.md + observed code patterns
   - `dependencies.md` — key deps, versions, external services, APIs
   - `test-strategy.md` — test runner, coverage approach, test file locations

4. Update `~/.brocode/wiki/index.md`:
   ```markdown
   ## <repo-slug>
   Path: <repo-path>
   Domain: <backend|frontend|mobile|sre|qa>
   Pattern: <monorepo|single-service|polyrepo>
   Stack: <tech stack>
   Last scanned: YYYY-MM-DD
   Wiki: ~/.brocode/wiki/<repo-slug>/
   ```

5. Append to `~/.brocode/wiki/log.md`:
   ```
   <repo-slug>  scanned  YYYY-MM-DD HH:MM  by <agent-role>
   ```

## Step 2: Invoke superpowers:systematic-debugging if stuck

If investigation stalls — 2 hypotheses eliminated, bug is intermittent, 3+ layers involved, contradictory symptoms — invoke `superpowers:systematic-debugging` before continuing.

## Step 3: Write findings to threads

Write findings to `.brocode/<id>/threads/<topic>.md`. One file per topic. Use descriptive names: `threads/api-pagination-strategy.md`, not `threads/backend.md`.

Format per entry:
```
[<Role> → All]: <finding or proposal>
[<Role> → Backend]: <targeted question>
```
```

- [ ] **Step 3: Commit**

```bash
git add agents/swe-backend.md agents/swe-frontend.md agents/swe-mobile.md
git commit -m "feat: engineer sub-agents — knowledge base scan, instruction file reading, systematic-debugging trigger"
```

---

## Task 6: Update `agents/sre.md` — combined ops + platform/infra + instruction file

**Files:**
- Modify: `agents/sre.md`

- [ ] **Step 1: Read current sre.md**

```bash
cat agents/sre.md
```

- [ ] **Step 2: Add instruction file reading + expand scope to platform/infra**

Add at top of sre.md (after role description):

```markdown
## Step 0: Read your instruction file
Read `.brocode/<id>/instructions/sre-<phase>.md`. It specifies what artifacts to read and what ops.md must cover.

## Scope: Ops + Platform/Infra

You cover two areas:

**Ops / Reliability:**
- Blast radius assessment (who is affected, which regions, traffic %)
- Rollback plan (executable steps, not theory — include exact commands)
- Observability: what metrics/alerts exist, what new ones are needed
- Deploy strategy: blue/green, canary, feature flag, migration order
- Pre-deploy checklist + runbook

**Platform / Infra:**
- CI/CD pipeline impact (does this change require pipeline updates?)
- Environment parity (dev/staging/prod differences that could cause issues)
- Infrastructure dependencies (new services, DBs, queues, caches needed)
- Secrets and config management
- Scaling implications (does this change load patterns, need autoscaling changes?)
```

- [ ] **Step 3: Commit**

```bash
git add agents/sre.md
git commit -m "feat: SRE — instruction file reading, combined ops + platform/infra scope"
```

---

## Task 7: Update `agents/qa.md` — instruction file + reports to Tech Lead

**Files:**
- Modify: `agents/qa.md`

- [ ] **Step 1: Read current qa.md**

```bash
cat agents/qa.md
```

- [ ] **Step 2: Add instruction file reading + explicit Tech Lead reporting**

Add at top of qa.md:

```markdown
## Step 0: Read your instruction file
Read `.brocode/<id>/instructions/qa-<phase>.md`. It specifies what artifacts to read, what domain the feature covers, and what test-cases.md must produce.

## Reporting
You report to Tech Lead. Write questions and findings to `threads/<topic>.md`.
Format: `[QA → Tech Lead]: <question about edge case or AC ambiguity>`

## Knowledge base
Read `~/.brocode/wiki/<repo-slug>/test-strategy.md` before writing tests — use the project's actual test runner and patterns.
```

- [ ] **Step 3: Commit**

```bash
git add agents/qa.md
git commit -m "feat: QA — instruction file reading, reports to Tech Lead, uses knowledge base test strategy"
```

---

## Task 8: Update `agents/pm.md` and `agents/designer.md` — instruction file reading

**Files:**
- Modify: `agents/pm.md`, `agents/designer.md`

- [ ] **Step 1: Read both files**

```bash
cat agents/pm.md
cat agents/designer.md
```

- [ ] **Step 2: Add instruction file reading to PM**

Add at top of pm.md:

```markdown
## Step 0: Read your instruction file
Read `.brocode/<id>/instructions/pm-<phase>.md`. It specifies what brief to read, what to produce, and any constraints from the user.
```

- [ ] **Step 3: Add instruction file reading to Designer**

Add at top of designer.md:

```markdown
## Step 0: Read your instruction file
Read `.brocode/<id>/instructions/designer-<phase>.md`. It specifies what product-spec.md to read, what ux.md must cover, and any design constraints.
```

- [ ] **Step 4: Commit**

```bash
git add agents/pm.md agents/designer.md
git commit -m "feat: PM + Designer — instruction file reading protocol"
```

---

## Task 9: Update Bar Raiser agents — instruction file reading, clarify no-write rule

**Files:**
- Modify: `agents/product-bar-raiser.md`, `agents/engineering-bar-raiser.md`

- [ ] **Step 1: Read both files**

```bash
cat agents/product-bar-raiser.md
cat agents/engineering-bar-raiser.md
```

- [ ] **Step 2: Add to product-bar-raiser.md**

Add at top:

```markdown
## Step 0: Read your instruction file
Read `.brocode/<id>/instructions/product-br-<round>-<artifact>.md`. It specifies which artifact to review, which prior challenge files to read, and the round number.

## Fresh sub-agent rule
You are dispatched fresh (new context) per round. Read ALL prior challenge files for this artifact before forming your opinion — don't repeat challenges already addressed.
```

- [ ] **Step 3: Add to engineering-bar-raiser.md**

Add at top:

```markdown
## Step 0: Read your instruction file
Read `.brocode/<id>/instructions/eng-br-<round>-<artifact>.md`. It specifies which artifact to review, cross-artifact files to check for consistency, and round number.

## Fresh sub-agent rule
You are dispatched fresh (new context) per round. Read ALL prior challenge files for this artifact before forming your opinion.

## Critical rule: You never write the spec
engineering-spec.md and tasks.md are written by Tech Lead. You challenge and approve them. Never write or rewrite them yourself.
```

- [ ] **Step 4: Commit**

```bash
git add agents/product-bar-raiser.md agents/engineering-bar-raiser.md
git commit -m "feat: Bar Raisers — instruction file reading, fresh-sub-agent rule, Eng BR no-write constraint"
```

---

## Task 10: Delete `agents/staff-eng.md`, fix remaining refs in `commands/brocode.md`

**Files:**
- Delete: `agents/staff-eng.md`
- Modify: `commands/brocode.md` (remove remaining Staff SWE refs)

- [ ] **Step 1: Delete staff-eng.md**

```bash
git rm agents/staff-eng.md
```

- [ ] **Step 2: Remove Staff SWE from repos subcommand domain mapping**

In `commands/brocode.md` line ~97, replace:
```
Unknown domains → pass to Staff SWE.
```
With:
```
Unknown domains → pass to Tech Lead to assign.
```

- [ ] **Step 3: Remove any remaining `architecture.md` artifact references from brocode.md**

Search and remove:
```bash
grep -n "architecture\.md\|staff-eng\|Staff SWE\|STAFF" commands/brocode.md
```
Remove each occurrence found.

- [ ] **Step 4: Commit**

```bash
git add commands/brocode.md
git rm agents/staff-eng.md
git commit -m "refactor: delete staff-eng.md, remove all Staff SWE refs from brocode.md"
```

---

## Task 11: Update context dir in `commands/brocode.md` — add instructions/ and brocode.md

**Files:**
- Modify: `commands/brocode.md` (context dir docs, if present)

- [ ] **Step 1: Find any context dir documentation in brocode.md**

```bash
grep -n "brocode/<id>" commands/brocode.md | head -20
```

- [ ] **Step 2: Add instructions/ dir and brocode.md to pre-flight steps**

In both INVESTIGATE and SPEC pre-flight sections, ensure:
```markdown
2. Create `.brocode/<id>/`, `.brocode/<id>/threads/`, `.brocode/<id>/br/engineering/`, `.brocode/<id>/instructions/`
```

- [ ] **Step 3: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: add instructions/ dir and brocode.md to context dir structure"
```

---

## Task 12: Update `CLAUDE.md` — sync flow summaries, remove remaining Staff SWE refs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read CLAUDE.md**

```bash
cat CLAUDE.md
```

- [ ] **Step 2: Update flow summaries**

Replace Investigate and Spec flow summaries with:

```markdown
### Investigate mode
```
TPM writes instruction files → Tech Lead sub-agent dispatched
Tech Lead dispatches (parallel sub-agents, scope-based):
    Backend / Frontend / Mobile — scan knowledge base → read repos → threads
    SRE — blast radius + ops + infra
    QA — failing test + test surface
Tech Lead synthesizes → investigation.md
    → Engineering BR loop (max 3 rounds per artifact)
    → Tech Lead writes engineering-spec.md + tasks.md
    → Engineering BR final check (max 2 rounds)
```

### Spec mode
```
TPM writes instruction files
PM sub-agent → product-spec.md
Designer sub-agent → ux.md
    → Product BR loop (max 3 rounds per artifact)
    → [GATE] engineering blocked until approved
TPM writes instruction files → Tech Lead sub-agent dispatched
Tech Lead dispatches (parallel sub-agents):
    Backend / Frontend / Mobile / SRE / QA
    All scan knowledge base first → read repos → threads
Tech Lead synthesizes → implementation-options.md
    → Engineering BR loop (max 3 rounds per artifact)
    → Tech Lead writes engineering-spec.md + tasks.md
    → Engineering BR final check (max 2 rounds)
```
```

- [ ] **Step 3: Update context dir structure**

Add `instructions/` and `brocode.md` to the context dir listing.

- [ ] **Step 4: Add knowledge base section**

Add after Repo Config section:

```markdown
## Knowledge Base

Engineer sub-agents persist repo intelligence to `~/.brocode/wiki/` — shared across all projects.

```
~/.brocode/wiki/
  index.md                    ← global TOC — all repos scanned
  log.md                      ← scan history
  <repo-slug>/
    overview.md               ← pattern, stack, CI
    patterns.md               ← monorepo layout, service boundaries
    conventions.md            ← extracted from CLAUDE.md + observed
    dependencies.md           ← key deps, external services
    test-strategy.md          ← test runner, patterns, locations
```

Agents re-scan if > 7 days since last scan. Knowledge compounds over time.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: sync CLAUDE.md — v2 flow summaries, instructions/ dir, knowledge base section"
```

---

## Task 13: Update `README.md` and `docs/index.html` — instructions/ dir, brocode.md, knowledge base

**Files:**
- Modify: `README.md`, `docs/index.html`

- [ ] **Step 1: Add instructions/ and brocode.md to README context dir mermaid**

In README.md, find the context dir mermaid graph and add:

```
ROOT --> INST["instructions/ — TPM writes before each dispatch"]:::dir
ROOT --> RETRO["brocode.md — post-run retrospective"]:::file
```

- [ ] **Step 2: Add knowledge base to README**

Add a "Knowledge base" section after "Repo config":

```markdown
## Knowledge base

Engineer sub-agents scan registered repos on first use and cache findings to `~/.brocode/wiki/`. Compounds over time.

```
~/.brocode/wiki/
  index.md            ← all repos, global TOC
  log.md              ← scan history
  <repo-slug>/
    overview.md       ← pattern, stack, CI
    patterns.md       ← layout, service boundaries
    conventions.md    ← from CLAUDE.md + observed
    dependencies.md   ← deps, external services
    test-strategy.md  ← test runner, patterns
```

Re-scanned automatically if > 7 days old.
```

- [ ] **Step 3: Update index.html context tree mermaid**

In `docs/index.html`, find the context tree mermaid and add nodes for `instructions/` and `brocode.md`:

```javascript
ROOT --> INST["instructions/\nTPM writes before each dispatch"]:::dir
ROOT --> RETRO["brocode.md\npost-run retrospective"]:::file
```

- [ ] **Step 4: Update agent count in hero text**

In `docs/index.html`, the hero text says "11 specialised agents". Staff SWE already removed from docs. Count is still correct (TPM, PM, Designer, Product BR, Tech Lead, Backend, Frontend, Mobile, SRE, QA, Eng BR = 11). No change needed.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/index.html
git commit -m "docs: add instructions/ dir, brocode.md retrospective, knowledge base to README + index.html"
```

---

## Self-Review

**Spec coverage check:**
- Sub-agent-per-role dispatch → Tasks 1, 2, 4 ✓
- Instruction file protocol (TPM writes before dispatch) → Tasks 1, 2, 3 ✓
- Knowledge base wiki structure → Task 5 ✓
- Engineer scan protocol (detect pattern, stack, conventions) → Task 5 ✓
- SRE = ops + platform/infra → Task 6 ✓
- QA reports to Tech Lead → Task 7 ✓
- PM + Designer instruction files → Task 8 ✓
- BR agents fresh per round, Eng BR no-write rule → Task 9 ✓
- Staff SWE deleted → Task 10 ✓
- Tech Lead owns engineering-spec + tasks → Tasks 4, 1, 2 ✓
- TPM live event printing → Task 3 ✓
- TPM brocode.md retrospective → Task 3 ✓
- brocode.md in context dir → Tasks 11, 12, 13 ✓
- superpowers:systematic-debugging in engineer agents → Task 5 ✓
- Docs sync → Tasks 12, 13 ✓

**Placeholder scan:** No TBDs or TODOs. All steps have concrete content.

**Type consistency:** No cross-task type references (all markdown files, no code types).

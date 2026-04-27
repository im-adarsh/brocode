# brocode v2 Architecture Design
Date: 2026-04-27  
Status: Approved

---

## Overview

brocode simulates a full software company engineering org. v2 makes every agent a true isolated sub-agent (fresh context, file-based communication), adds a persistent wiki-style knowledge base, gives Tech Lead ownership of all engineering outputs, and wires superpowers skills throughout.

---

## 1. Sub-agent dispatch model

Every role = isolated sub-agent with fresh context. No inline orchestration. Agents communicate only through files.

**Dispatch protocol:** TPM writes an instruction file before each dispatch:

```
.brocode/<id>/instructions/<role>-<phase>.md
  contains: what to do, what files to read, what file to write, constraints
```

Sub-agent reads instruction file first. Output file path declared in instruction. No guessing.

**Hierarchy:**

```
TPM (brocode.md orchestrator)
  ├── PM sub-agent
  ├── Designer sub-agent
  ├── Product BR sub-agent (fresh per round)
  ├── Tech Lead sub-agent
  │     ├── Backend Engineer sub-agent    (parallel)
  │     ├── Frontend Engineer sub-agent   (parallel)
  │     ├── Mobile Engineer sub-agent     (parallel)
  │     ├── SRE sub-agent                 (parallel)
  │     └── QA sub-agent                 (parallel)
  └── Engineering BR sub-agent (fresh per round)
```

---

## 2. Knowledge base — wiki style

Persistent, compounds over time. Stored at `~/.brocode/wiki/`.

**Structure:**

```
~/.brocode/
  repos.json                    ← registered repos (existing)
  wiki/
    index.md                    ← global TOC — all repos + topics
    log.md                      ← scan history (what was scanned, when)
    <repo-slug>/
      overview.md               ← pattern, stack, structure, CI summary
      patterns.md               ← monorepo layout, service boundaries, naming
      conventions.md            ← extracted from CLAUDE.md + observed patterns
      dependencies.md           ← key deps, versions, external services
      test-strategy.md          ← test runner, coverage approach, test locations
```

**Engineer sub-agent scan protocol (runs before any analysis):**

```
1. Read ~/.brocode/wiki/log.md
   If <repo-slug> scanned < 7 days ago → use cached wiki pages, skip scan
   Else → scan:

2. For each repo in ~/.brocode/repos.json for my domain:
   a. Read CLAUDE.md → extract conventions, tech decisions, patterns
   b. Read package.json / go.mod / pubspec.yaml / Gemfile etc. → detect stack
   c. ls root → detect monorepo (packages/, apps/, services/) vs single-service
   d. Check CI config (.github/workflows/, .gitlab-ci.yml) → deploy patterns
   e. Detect test patterns (jest.config, pytest.ini, test/ dir structure)

3. Write to ~/.brocode/wiki/<repo-slug>/:
   overview.md, patterns.md, conventions.md, dependencies.md, test-strategy.md

4. Update ~/.brocode/wiki/index.md (add/update repo entry)
5. Append to ~/.brocode/wiki/log.md: "<repo-slug> scanned YYYY-MM-DD HH:MM"
```

Tech Lead reads `~/.brocode/wiki/index.md` before dispatching sub-agents — understands full system topology first.

---

## 3. Superpowers integration

| When | Skill | Who |
|------|-------|-----|
| Investigation stalls (2 hypotheses eliminated, intermittent, contradictory symptoms) | `superpowers:systematic-debugging` | Backend / Frontend / Mobile sub-agent |
| Develop mode — per domain | `superpowers:using-git-worktrees` | TPM (orchestrates per domain) |
| Develop mode — convert tasks | `superpowers:writing-plans` | TPM |
| Develop mode — implement per task | `superpowers:subagent-driven-development` | TPM |
| Develop mode — push + PR | `superpowers:finishing-a-development-branch` | TPM |
| Review mode — PR/MR review | `superpowers:code-review` | Tech Lead |

---

## 4. Agent roster

| Agent | Reports to | Produces | Model |
|-------|-----------|---------|-------|
| TPM | — | `tpm-logs.md`, `brocode.md`, instruction files | — |
| PM | TPM | `product-spec.md` | sonnet |
| Designer | TPM | `ux.md` | sonnet |
| Product BR | TPM | challenge files, `gate-approved.md` | opus |
| Tech Lead | TPM | `implementation-options.md` / `investigation.md`, `engineering-spec.md`, `tasks.md` | opus |
| Backend Engineer | Tech Lead | findings via `threads/<topic>.md` | sonnet |
| Frontend Engineer | Tech Lead | findings via `threads/<topic>.md` | sonnet |
| Mobile Engineer | Tech Lead | findings via `threads/<topic>.md` | sonnet |
| SRE | Tech Lead | `ops.md` | sonnet |
| QA | Tech Lead | `test-cases.md` | sonnet |
| Engineering BR | TPM | challenge files | opus |

**Key ownership rule:** Tech Lead is the sole producer of `engineering-spec.md` and `tasks.md`. Engineering BR challenges and approves but never writes the spec.

---

## 5. Artifact ownership

| Artifact | Producer | Challenger |
|----------|----------|-----------|
| `product-spec.md` | PM | Product BR |
| `ux.md` | Designer | Product BR |
| `implementation-options.md` | Tech Lead | Engineering BR |
| `ops.md` | SRE | Engineering BR |
| `test-cases.md` | QA | Engineering BR |
| `engineering-spec.md` | **Tech Lead** | Engineering BR (final check) |
| `tasks.md` | **Tech Lead** | Engineering BR (final check) |

---

## 6. TPM — event stream, decision log, live output, retrospective

### Live terminal output (printed as events happen)

```
📋  TPM          →  spec-20260427-oauth started
🎯  PM           →  reading brief, building requirements
🎨  Designer     →  dispatched in parallel
🎯  PM  ↔️  🎨 DS →  thread opened: "empty state for first-time users?"
✅  PM           →  product-spec.md v1 written
🔬  Product BR   →  reviewing product-spec.md (round 1)
⚠️  Product BR   →  CHALLENGED: 3 issues — routing back to PM
🎯  PM           →  revising product-spec.md (v2)
✅  Product BR   →  product-spec.md APPROVED
🔓  TPM          →  [D-001] product gate OPEN — engineering starts
🤝  Tech Lead    →  dispatched
⚙️  Backend      →  scanning repos + knowledge base
🖥️  Frontend     →  scanning repos + knowledge base  [parallel]
📱  Mobile       →  scanning repos + knowledge base  [parallel]
🚨  SRE          →  assessing ops + infra impact     [parallel]
🧪  QA           →  reviewing test surface           [parallel]
⚙️  Backend  ↔️  🖥️ FE  →  thread: "3 round-trips per screen load"
⚠️  Eng BR       →  CHALLENGED implementation-options.md (round 1)
🤝  Tech Lead    →  revising options (v2)
✅  Eng BR       →  all artifacts APPROVED
🤝  Tech Lead    →  writing engineering-spec.md + tasks.md
✅  Eng BR       →  engineering-spec.md APPROVED
📊  TPM          →  writing brocode.md retrospective
✅  TPM          →  DONE — spec-20260427-oauth complete (22 min)
```

Prefixes: `⚠️` challenge · `✅` approved · `🔓` gate open · `🚫` blocked/escalated

### `tpm-logs.md` — append-only journal

```markdown
## Events
E-001  10:32  TPM        → run started: spec-20260427-oauth
E-002  10:32  TPM        → instruction written: instructions/pm-phase1.md
E-003  10:32  PM         → dispatched
E-004  10:34  PM         → product-spec.md written (v1)
...

## Decisions
D-001  10:43  Product gate OPEN
              options: [wait for ux approval | open now]
              chosen: open now
              reason: product-spec approved, unblocks TL while ux completes

## Reviewer Revision Requests
| ID | Constraint | References | Status |
|----|-----------|-----------|--------|
```

### `brocode.md` — post-run retrospective (written by TPM)

```markdown
# brocode run: <id>
Date: ...  Duration: ... min  Mode: Spec | Investigate | Develop | Review

## What happened
(summary of phases, rounds, threads, key decisions)

## What went well
(fast convergences, good catches, thorough analysis)

## What could be better
(BR context drift, missing repos, thin analysis areas)

## Suggestions
(actionable: register repos, add AC template, etc.)
```

---

## 7. Full file structure

```
~/.brocode/
  repos.json
  wiki/
    index.md
    log.md
    <repo-slug>/
      overview.md
      patterns.md
      conventions.md
      dependencies.md
      test-strategy.md

.brocode/<id>/
  brief.md
  tpm-logs.md
  brocode.md                         ← post-run retrospective
  instructions/
    pm-phase1.md
    designer-phase1.md
    product-br-round1-product-spec.md
    tech-lead-phase2.md
    backend-phase2.md
    frontend-phase2.md
    mobile-phase2.md
    sre-phase2.md
    qa-phase2.md
    eng-br-round1-impl-options.md
    tech-lead-final-spec.md
    eng-br-final-spec.md
  product-spec.md
  ux.md
  implementation-options.md
  ops.md
  test-cases.md
  engineering-spec.md
  tasks.md
  threads/
    <topic>.md
  br/
    product/
      01-product-spec-challenge-round1.md
      01-product-spec-approved.md
      02-ux-challenge-round1.md
      02-ux-approved.md
      gate-approved.md
    engineering/
      01-impl-options-challenge-round1.md
      01-impl-options-approved.md
      02-ops-approved.md
      03-test-cases-challenge-round1.md
      03-test-cases-approved.md
      04-engineering-spec-approved.md
      05-tasks-approved.md
```

---

## 8. Real-world company flow map

```
DISCOVERY     PM + Designer → Product BR gate
PLANNING      Tech Lead + team (parallel sub-agents) → implementation-options.md
REVIEW        Engineering BR challenges all artifacts → Tech Lead revises
SYNTHESIS     Tech Lead writes engineering-spec.md + tasks.md → Eng BR approves
IMPLEMENT     Per domain: worktree → plan → TDD → review → PR
CODE REVIEW   Tech Lead + domain sub-agents → inline comments on PR/MR
KNOWLEDGE     Every engineer scan → ~/.brocode/wiki/ (compounds over time)
TPM           Logs every event, every decision, writes retrospective
```

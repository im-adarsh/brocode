# CLAUDE.md — brocode

## What this is

brocode is a multi-agent SDLC plugin. It simulates a full engineering org — PM, Designer, SWE, Staff SWE, SRE, QA, and two specialized Bar Raisers — to investigate bugs and produce engineering specs.

Single entry point: `/brocode`

---

## Agent roster

| File | Role | Track |
|------|------|-------|
| `agents/tpm.md` | Technical Program Manager — coordinates all agents, owns run log | Cross-cutting |
| `agents/pm.md` | Product Manager | Product |
| `agents/designer.md` | Designer (API + UX) | Product |
| `agents/product-bar-raiser.md` | Principal PM / Head of Product | Product gate |
| `agents/tech-lead.md` | Tech Lead — owns engineering team (Backend, Frontend, Mobile, SRE) | Engineering |
| `agents/swe-backend.md` | Backend Engineer — APIs, DB, services, queues | Engineering |
| `agents/swe-frontend.md` | Frontend/Fullstack Engineer — web UI, state, browser | Engineering |
| `agents/swe-mobile.md` | Mobile Engineer — iOS, Android, React Native, Flutter | Engineering |
| `agents/staff-eng.md` | Staff Software Engineer | Engineering |
| `agents/sre.md` | Site Reliability Engineer | Engineering |
| `agents/qa.md` | QA Engineer | Engineering |
| `agents/engineering-bar-raiser.md` | Principal Engineer | Engineering gate |

## Skills

| File | Purpose |
|------|---------|
| `skills/setup-repos/SKILL.md` | Register local repo paths for engineer agents (user-level, persisted) |

All orchestration logic lives in `commands/brocode.toml`. Agent roles use superpowers skills directly:
- Debugging: `superpowers:systematic-debugging`
- Planning: `superpowers:writing-plans`
- Implementation: `superpowers:subagent-driven-development`
- Branch completion: `superpowers:finishing-a-development-branch`
- Worktrees: `superpowers:using-git-worktrees`
- TPM orientation: `superpowers:using-superpowers`

## Commands

| File | Command |
|------|---------|
| `commands/brocode.toml` | `/brocode` — single entry point; `/brocode repos` to register repo paths |

## Repo Config

Engineer agents read `.brocode-repos.json` from the project root to locate real codebases:

```json
{
  "backend": "/absolute/path/to/backend",
  "web": "/absolute/path/to/web",
  "mobile": "/absolute/path/to/mobile",
  "other": []
}
```

- Run `/brocode repos` to create or update this file
- File is git-ignored (paths are machine-local)
- If a path is missing, the relevant engineer agent asks the user before proceeding

## Terminal Progress Display

TPM prints a live progress line to the terminal at every agent transition:

```
🟢  📋 TPM          →  kicked off spec-20260426-user-auth
🟢  🎯 PM           →  reading brief, building requirements
🟢  🎯 PM      ↔️  🎨 Designer    →  PM asked: "empty state for first-time users?"
⚠️  🔬 Product BR   →  found gap: ops interface missing — routing back to PM
✅  🔬 Product BR   →  APPROVED — product gate OPEN
⚠️  ⚖️ Eng BR       →  challenged: "option 3 has N+1 query — explain mitigation"
✅  ⚖️ Eng BR       →  all artifacts APPROVED
```

Prefixes: `🟢` working · `↔️` agent conversation · `⚠️` BR challenge · `✅` approved · `🚫` blocked

---

## Flow summary

### Investigate mode
```
Tech Lead dispatches → Backend + Frontend + Mobile (scoped subset, parallel)
    ↕ debate in swe-debate.md thread
Tech Lead synthesizes + SRE (parallel)
    → Staff SWE (validates root cause)
    → Engineering BR (adversarial loop, max 2 rounds)
    → 08-final-spec.md + 09-tasks.md
```

### Spec mode
```
PM ↔ Designer (conversation, both report to Product BR)
    → Product BR (adversarial loop, web search on competitors)
    → [GATE] engineering starts only after product approved
Tech Lead dispatches → Backend + Frontend + Mobile (scoped subset, parallel)
    ↕ debate in swe-debate.md thread
Tech Lead synthesizes → Staff SWE (converge on recommendation)
    → SRE (Tech Lead's team) + QA (parallel)
    → Engineering BR (adversarial loop, cross-artifact consistency)
    → 08-final-spec.md + 09-tasks.md
```

### Develop mode (`/brocode develop`)
```
Requires: superpowers plugin installed
Reads: 08-final-spec.md + 09-tasks.md
    → superpowers:using-git-worktrees (one worktree per domain)
    → superpowers:writing-plans (convert 09-tasks.md to superpowers plan per domain)
    → superpowers:subagent-driven-development (implementer + spec review + quality review per task)
        ↕ superpowers:systematic-debugging when blocked
    → superpowers:finishing-a-development-branch (tests → PR per domain)
```

---

## Key rules for agents working here

- Edit only your own artifact file — never another agent's
- Threads are append-only — add entries, never rewrite
- Read-before-edit: always Read a file before Edit/Write on existing files
- Bar Raiser challenges are blockers, not suggestions — producers must respond
- Max 2 BR challenge rounds per artifact — then escalate to user with specific question
- No engineering track starts before Product BR gate approval (spec mode)
- No fix proposed without confirmed root cause (investigate mode)
- All artifacts versioned — increment Version N on each revision

---

## Context directory structure

```
.sdlc/<id>/
  00-tpm-log.md               ← TPM master progress log (updated throughout)
  00-brief.md
  00-input-raw.md
  01-requirements.md
  02-design.md
  03-investigation.md | 03-implementation-options.md
  04-architecture.md
  05-ops.md
  06-test-cases.md
  threads/
    product-conversation.md
    swe-debate.md               ← Backend ↔ Frontend ↔ Mobile debate
    eng-conversation.md         ← SWE team ↔ Staff SWE ↔ SRE ↔ QA
    eng-product-conversation.md ← Eng ↔ PM/Designer
  07-product-br-reviews/
  07-eng-br-reviews/
  08-final-spec.md
```

---

## Adding new agents or roles

1. Create `agents/<role>.md` following existing agent format
2. Add to this CLAUDE.md roster table
3. Update the relevant skill (investigate or spec) to dispatch the new agent
4. Update `skills/using-sdlc/SKILL.md` if it affects the visible flow

## Modifying BR challenge standards

- Product BR challenge standards: `agents/product-bar-raiser.md` → "Challenge Standards" section
- Engineering BR challenge standards: `agents/engineering-bar-raiser.md` → "What You Look For" section

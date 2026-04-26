# CLAUDE.md — brocode

## What this is

brocode is a multi-agent SDLC plugin. It simulates a full engineering org — PM, Designer, Tech Lead, Staff SWE, SRE, QA, and two Bar Raisers — to investigate bugs, produce engineering specs, and implement approved work.

Single entry point: `/brocode`

---

## Agent roster

| File | Role | Track |
|------|------|-------|
| `agents/tpm.md` | TPM — program orchestrator, logs all transitions | Cross-cutting |
| `agents/pm.md` | Product Manager | Product |
| `agents/designer.md` | Designer (API + UX) | Product |
| `agents/product-bar-raiser.md` | Principal PM / Head of Product — gates engineering | Product gate |
| `agents/tech-lead.md` | Tech Lead — owns engineering team (Backend, Frontend, Mobile, SRE) | Engineering |
| `agents/swe-backend.md` | Backend Engineer sub-agent | Engineering |
| `agents/swe-frontend.md` | Frontend/Fullstack Engineer sub-agent | Engineering |
| `agents/swe-mobile.md` | Mobile Engineer sub-agent | Engineering |
| `agents/sre.md` | SRE — ops, blast radius, rollback (Tech Lead's team) | Engineering |
| `agents/staff-eng.md` | Staff SWE — architecture review, peer to Tech Lead | Engineering |
| `agents/qa.md` | QA Engineer | Engineering |
| `agents/engineering-bar-raiser.md` | Principal Engineer — gates final spec + tasks | Engineering gate |

## Skills

| File | Purpose |
|------|---------|
| `skills/setup-repos/SKILL.md` | Register local repo paths (user-level, persisted to `.brocode-repos.json`) |

All orchestration lives in `commands/brocode.toml`. Agents use superpowers skills directly:

| When | Skill |
|------|-------|
| TPM session start | `superpowers:using-superpowers` |
| Investigation stalls / bug encountered | `superpowers:systematic-debugging` |
| Convert 09-tasks.md to plan | `superpowers:writing-plans` |
| Execute plan task by task | `superpowers:subagent-driven-development` |
| Finish domain branch + PR | `superpowers:finishing-a-development-branch` |
| Isolated domain workspace | `superpowers:using-git-worktrees` |

## Commands

| File | Triggers |
|------|---------|
| `commands/brocode.toml` | `/brocode <bug or feature>` · `/brocode repos` · `/brocode develop` |

## Repo Config

Engineer agents read `.brocode-repos.json` from the project root:

```json
{
  "backend": "/absolute/path/to/backend",
  "web": "/absolute/path/to/web",
  "mobile": "/absolute/path/to/mobile",
  "other": []
}
```

- Run `/brocode repos` to create or update
- Git-ignored (machine-local paths)
- Missing path → agent asks user, never silent failure

---

## Flow summary

### Investigate mode
```
Tech Lead → scoped sub-agents (Backend / Frontend / Mobile, parallel)
    ↕ debate: swe-debate.md
Tech Lead synthesizes  +  SRE (parallel, blast radius)
    → Staff SWE (validates root cause architecturally)
    → Engineering BR loop (max 3 rounds per artifact)
    → 08-final-spec.md + 09-tasks.md
```

### Spec mode
```
PM ↔ Designer (conversation)
    → Product BR loop (max 3 rounds per artifact)
    → [GATE] engineering blocked until approved
Tech Lead → scoped sub-agents (parallel)
    ↕ debate: swe-debate.md
Tech Lead + Staff SWE converge
    → SRE + QA (parallel)
    → Engineering BR loop (max 3 rounds per artifact)
    → 08-final-spec.md + 09-tasks.md
```

### Develop mode
```
Requires: superpowers installed
Reads: 08-final-spec.md + 09-tasks.md
Per domain (backend / web / mobile):
    → superpowers:using-git-worktrees
    → superpowers:writing-plans
    → superpowers:subagent-driven-development (per task: implement → spec review → quality review)
        ↕ superpowers:systematic-debugging if blocked
    → superpowers:finishing-a-development-branch → PR
```

---

## Key rules for agents

- Edit only your own artifact — never another agent's file
- Threads are append-only — add entries, never rewrite
- Read-before-edit: always Read before Edit/Write on existing files
- BR challenges are blockers, not suggestions — producers must respond
- Max 3 BR rounds per artifact — then escalate to user with exact question
- No engineering track before Product BR gate approval (spec mode)
- No fix without confirmed root cause (investigate mode)
- All artifacts versioned — increment Version N on each revision

---

## Context directory structure

```
.sdlc/<id>/
  00-tpm-log.md
  00-brief.md
  01-requirements.md
  02-design.md
  03-investigation.md | 03-implementation-options.md
  04-architecture.md
  05-ops.md
  06-test-cases.md
  threads/
    product-conversation.md      ← PM ↔ Designer
    swe-debate.md                ← Backend ↔ Frontend ↔ Mobile
    eng-conversation.md          ← Tech Lead ↔ Staff SWE ↔ SRE ↔ QA
    eng-product-conversation.md  ← Eng ↔ PM/Designer
  07-product-br-reviews/
  07-eng-br-reviews/
  08-final-spec.md
  09-tasks.md
```

---

## Adding new agents

1. Create `agents/<role>.md`
2. Add to roster table above
3. Add dispatch step to relevant phase in `commands/brocode.toml`

## Modifying BR challenge standards

- Product BR: `agents/product-bar-raiser.md` → "What You Look For"
- Engineering BR: `agents/engineering-bar-raiser.md` → "What You Look For"

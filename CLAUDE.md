# CLAUDE.md — brocode

## What this is

brocode is a multi-agent SDLC plugin. It simulates a full engineering org — PM, Designer, Tech Lead, SRE, QA, and two Bar Raisers — to investigate bugs, produce engineering specs, and implement approved work.

Single entry point: `/brocode`

---

## Agent roster

| File | Role | Track |
|------|------|-------|
| `agents/tpm.md` | TPM — program orchestrator, logs all transitions | Cross-cutting |
| `agents/pm.md` | Product Manager | Product |
| `agents/designer.md` | Designer (UX / UI) — user flows, screen states, interaction design | Product |
| `agents/product-bar-raiser.md` | Principal PM / Head of Product — gates engineering | Product gate |
| `agents/tech-lead.md` | Tech Lead — owns engineering team (Backend, Frontend, Mobile, SRE) | Engineering |
| `agents/swe-backend.md` | Backend Engineer sub-agent | Engineering |
| `agents/swe-frontend.md` | Frontend/Fullstack Engineer sub-agent | Engineering |
| `agents/swe-mobile.md` | Mobile Engineer sub-agent | Engineering |
| `agents/sre.md` | SRE — ops, blast radius, rollback (Tech Lead's team) | Engineering |
| `agents/qa.md` | QA Engineer (Tech Lead's team) | Engineering |
| `agents/engineering-bar-raiser.md` | Principal Engineer — gates final spec + tasks | Engineering gate |

## Skills

All orchestration lives in `commands/brocode.md`. Agents use superpowers skills directly:

| When | Skill |
|------|-------|
| TPM session start | `superpowers:using-superpowers` |
| Investigation stalls / bug encountered | `superpowers:systematic-debugging` |
| Code review on PR/MR | `superpowers:code-review` |
| Convert tasks.md to plan | `superpowers:writing-plans` |
| Execute plan task by task | `superpowers:subagent-driven-development` |
| Finish domain branch + PR | `superpowers:finishing-a-development-branch` |
| Isolated domain workspace | `superpowers:using-git-worktrees` |

## Commands

| File | Triggers |
|------|---------|
| `commands/brocode.md` | `/brocode:brocode <bug or feature>` · `/brocode:brocode repos` · `/brocode:brocode develop` · `/brocode:brocode review <url>` · `/brocode:brocode revise` |

## Repo Config

Engineer agents read `~/.brocode/repos.json` (user-level, shared across all projects). Any domain name, multiple repos per domain, each with metadata:

```json
{
  "backend": [
    {
      "path": "/path/to/api",
      "description": "Main REST API handling user accounts and billing",
      "labels": ["api", "billing"],
      "tags": ["node", "express", "postgres"]
    },
    {
      "path": "/path/to/auth-service",
      "description": "Authentication and token issuance service",
      "labels": ["auth", "security"],
      "tags": ["go", "jwt", "redis"]
    }
  ],
  "mobile": [
    {
      "path": "/path/to/ios",
      "description": "iOS app (Swift/SwiftUI)",
      "labels": ["ios"],
      "tags": ["swift", "swiftui"]
    }
  ],
  "updated_at": "YYYY-MM-DD"
}
```

- Run `/brocode:brocode repos` to create or update
- Stored at `~/.brocode/repos.json` — shared across all projects on this machine
- Agents read `description`, `labels`, and `tags` to orient before exploring code
- Domain → agent mapping: `backend` → Backend Engineer, `mobile` → Mobile Engineer, `web`/`fullstack` → Frontend Engineer, `terraform`/`infra`/`sre` → SRE, `qa` → QA
- Missing path → agent warns user, never silent failure

---

## Flow summary

### Investigate mode
```
Tech Lead → scoped sub-agents (Backend / Frontend / Mobile / SRE / QA, parallel)
    ↕ debate: threads/<topic>.md
Tech Lead synthesizes
    → Engineering BR loop (max 3 rounds per artifact)
    → engineering-spec.md + tasks.md
```

### Spec mode
```
PM ↔ Designer (conversation)
    → Product BR loop (max 3 rounds per artifact)
    → [GATE] engineering blocked until approved
Tech Lead → scoped sub-agents (Backend / Frontend / Mobile / SRE / QA, parallel)
    ↕ debate: threads/<topic>.md
Tech Lead synthesizes
    → Engineering BR loop (max 3 rounds per artifact)
    → engineering-spec.md + tasks.md
```

### Develop mode
```
Requires: superpowers installed
Reads: final-spec.md + tasks.md
Per domain (backend / web / mobile) — parallel:
    → superpowers:using-git-worktrees  (isolated worktree)
    → superpowers:writing-plans
    → superpowers:subagent-driven-development (per task: implement → spec review → quality review)
        ↕ superpowers:systematic-debugging if blocked
    → superpowers:finishing-a-development-branch → PR
    → git worktree remove --force  (cleanup after PR)
```

### Review mode
```
Requires: superpowers installed + PR/MR URL
Tech Lead dispatches Backend / Frontend / Mobile sub-agents (parallel) to review each domain
Tech Lead synthesizes findings
→ superpowers:code-review
→ inline comments posted via GitHub API (gh) or GitLab API (glab) on exact file+line
→ top-level summary comment: verdict + domain breakdown
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
.brocode/<id>/
  brief.md                ← user input + clarified scope
  tpm-logs.md             ← TPM journal (E-NNN events + D-NNN decisions)
  product-spec.md         ← PM — pRFC format
  ux.md                   ← Designer — UX flows + e2e mermaid per persona
  implementation-options.md ← Tech Lead (spec mode)
  investigation.md          ← Tech Lead (investigate mode)
  ops.md                    ← SRE
  test-cases.md             ← QA
  engineering-spec.md       ← RFC — full self-contained spec
  tasks.md                  ← domain-scoped implementation tasks
  br/
    product/
      req-challenge-r1.md   ← Product BR challenges on product-spec
      req-approved.md
      ux-challenge-r1.md    ← Product BR challenges on ux
      ux-approved.md
      gate-approved.md      ← product gate opened
    engineering/
      impl-challenge-r1.md  ← Eng BR challenges per artifact
      impl-approved.md
      ops-challenge-r1.md
      ops-approved.md
      qa-challenge-r1.md
      qa-approved.md
  threads/
    <topic-slug>.md         ← one per discussion topic, created on demand
                               format: Topic / Discussion / Decision
```

---

---

## Adding new agents

1. Create `agents/<role>.md`
2. Add to roster table above
3. Add dispatch step to relevant phase in `commands/brocode.md`

## Modifying BR challenge standards

- Product BR: `agents/product-bar-raiser.md` → "What You Look For"
- Engineering BR: `agents/engineering-bar-raiser.md` → "What You Look For"

# Deep Code Reading, Product Knowledge, Agent Clarification & E2E Spec Design

## Goal

Make brocode agents behave like real engineers: read the codebase before opining on it, ground PM work in existing product decisions, let key agents ask clarifying questions, and produce engineering specs + tasks that cover the full vertical slice.

---

## 1. Engineer Agents — Deep Code Reading

**Applies to:** Backend Engineer, Frontend Engineer, Mobile Engineer, SRE, QA

### Broad Read (Step 1 expansion)

Before narrowing to the bug/feature, every engineer agent reads broadly:

1. `README`, `CLAUDE.md`/`AGENTS.md` — conventions, stack overview
2. Entry points — `main.*`, `app.*`, `index.*`, `server.*`, top-level dirs
3. Test dir structure — patterns, coverage, test runner
4. Key config files — `package.json`, `go.mod`, `Cargo.toml`, CI config
5. Major service boundaries, modules, data models

### Freshness Check (before using cached wiki)

```bash
git -C <repo-path> log --since="<last-scan-date>" --name-only --format="" | sort -u
```

- If files changed since last scan → re-read those files, update relevant wiki pages
- If no changes → use cached wiki as-is
- Wiki pages updated: `overview.md`, `patterns.md`, `conventions.md`, `dependencies.md`, `test-strategy.md`

### Then Narrow

Apply broad understanding to the specific bug/feature from the instruction file.

---

## 2. PM — Product Knowledge Repo

New domain key `"product"` in `~/.brocode/repos.json`. Supports paths and URLs:

```json
{
  "product": [
    {
      "path": "/path/to/product-docs",
      "description": "PRDs, ADRs, roadmap docs",
      "labels": ["prd", "adr"],
      "tags": ["markdown"]
    },
    {
      "url": "https://notion.so/my-workspace",
      "description": "Product wiki and user research",
      "labels": ["wiki", "research"],
      "tags": ["notion"]
    }
  ]
}
```

**PM Step 0.5 (new):** Read `~/.brocode/repos.json` → check `product` domain.

- Path entry → read markdown files: PRDs, ADRs, roadmap, research docs
- URL entry → print `📎 Product knowledge at <url> — open before writing spec`; use MCP if available, otherwise prompt user to paste relevant sections
- No `product` domain → skip silently, proceed as today

PM uses this context when writing `product-spec.md` — grounds spec in existing decisions, avoids contradicting prior ADRs, references real user research.

`/brocode:brocode repos` updated to prompt for `product` domain during setup.

---

## 3. Agent Clarification Prompts

Agents that hit unresolvable ambiguity during their work may surface a structured question to the user before continuing. Engineer agents do NOT prompt — they surface findings in threads only.

**Agents that can prompt:** PM, Tech Lead, Product BR, Engineering BR

**Format:**

```
❓ [Agent] → needs clarification before continuing:

<question>

Options:
A) ...
B) ...
C) ...

Reply with A / B / C or free text.
```

**When to prompt:**
- PM: conflicting product knowledge sources, missing persona definition, unclear success metric
- Tech Lead: multiple valid architectural approaches with materially different tradeoffs, unclear domain ownership
- Product BR: challenge requires user policy decision (not a spec gap the PM can fill alone)
- Engineering BR: challenge requires user priority call (e.g., "skip mobile for v1?" requires user decision)

**Rules:**
- One question per prompt — no batching
- Only prompt when code/docs cannot resolve the ambiguity
- After user replies, continue immediately — do not re-ask
- Log decision in `tpm-logs.md` as a D-NNN entry

---

## 4. TPM Model

TPM switches to `claude-haiku-4-5` — orchestration only, no deep reasoning needed. Fast and cheap.

**Model line in `agents/tpm.md`:**
```
**Model: claude-haiku-4-5** — orchestration only; reads, routes, writes instruction files, logs events
```

---

## 5. Engineering Spec — End-to-End Vertical Slice

`engineering-spec.md` must cover the full vertical slice. Tech Lead owns the whole document.

**Required sections:**

1. **Summary** — one paragraph, what changes and why
2. **Scope** — what's in, what's explicitly out
3. **Data layer** — DB schema changes, migrations, data model
4. **API layer** — endpoints, request/response contracts, auth
5. **Business logic** — service layer, rules, edge cases
6. **Frontend** — UI components, state, API integration, error/empty states
7. **Mobile** — iOS/Android screens, navigation, API integration (or "not in scope")
8. **Infrastructure** — infra changes, env vars, secrets, dependencies
9. **Deployment** — deploy steps, feature flags, staged rollout
10. **Rollback** — how to revert, data migration reversal if needed
11. **Monitoring & alerting** — metrics, alerts, SLOs affected
12. **Security** — threat model, auth changes, data sensitivity
13. **Testing** — unit, integration, E2E test plan per layer
14. **Open questions** — unresolved items with owner + deadline

Tech Lead may mark sections "N/A — not affected" but must not omit them.

Engineering BR reviews the full spec against all 14 sections before approving.

---

## 6. Tasks File — End-to-End, Sectioned

`tasks.md` is one file covering all domains, with clear sections:

```markdown
# Tasks — <feature/bug name>

## Backend
- [ ] T-001: ...
- [ ] T-002: ...

## Frontend
- [ ] T-010: ...

## Mobile
- [ ] T-020: ...

## Infrastructure
- [ ] T-030: ...

## QA
- [ ] T-040: ...
```

Tasks are numbered with domain prefix. Each task references the relevant engineering-spec section.

---

## Affected Files

| File | Change |
|------|--------|
| `agents/tpm.md` | Model → Haiku; clarification prompt logging rule |
| `agents/pm.md` | Step 0.5 product knowledge read; clarification prompt format |
| `agents/tech-lead.md` | Broad read instruction; E2E spec sections mandate; clarification prompt format |
| `agents/swe-backend.md` | Expanded Step 1 broad read + git freshness check |
| `agents/swe-frontend.md` | Expanded Step 1 broad read + git freshness check |
| `agents/swe-mobile.md` | Expanded Step 1 broad read + git freshness check |
| `agents/sre.md` | Expanded Step 1 broad read + git freshness check |
| `agents/qa.md` | Expanded Step 1 broad read + git freshness check |
| `agents/product-bar-raiser.md` | Clarification prompt format |
| `agents/engineering-bar-raiser.md` | Clarification prompt format; E2E spec review checklist |
| `skills/brocode/modes/subcommands.md` | `repos` subcommand: add `product` domain prompt |
| `CLAUDE.md` | TPM model note; engineering spec sections list; tasks.md structure |
| `templates/engineering-spec.md` | Add all 14 sections |

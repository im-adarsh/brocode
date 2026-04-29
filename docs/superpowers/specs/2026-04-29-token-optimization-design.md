# Token Optimization Design

**Goal:** Reduce tokens consumed per brocode run by 40–60% without losing information agents need to do their job.

**Architecture:** Five mechanisms applied at different layers — instruction file compression (runtime, per-dispatch), Quick Reference headers (static, per-agent-file), thread summarization (runtime, post-BR-round), wiki compaction (runtime, post-run), live TodoWrite tracking (runtime, every phase transition). No new commands. No new files except compacted wiki versions written in place.

**Tech Stack:** Markdown edits to existing agent files and commands/brocode.md. TPM enforces all runtime mechanisms inline. No new dependencies.

---

## Mechanism 1: Compressed Instruction Files

**Location:** `commands/brocode.md` — instruction file writing rules, one block per role.

**Current state:** TPM writes a generic instruction file with the same shape for every role. SRE gets the full brief. PM gets all threads. Each agent cold-reads the entire `.brocode/<id>/` directory.

**New rule:** Each instruction file includes ONLY context that role needs. TPM follows a role-scoped include list:

| Role | Include in instruction file |
|------|---------------------------|
| PM | brief.md, user goals, any existing product-spec.md (for revision) |
| Designer | brief.md, product-spec.md (approved version only), prior ux.md (for revision) |
| Product BR | The artifact being challenged only (product-spec.md OR ux.md, not both) |
| Tech Lead | brief.md, product-spec.md (gate-approved), ux.md (gate-approved), tpm-logs.md (D-NNN decision rows only — the `### [D-NNN]` blocks, not E-NNN events) |
| Backend / Frontend / Mobile | Their domain section of brief.md + relevant threads/<topic>.md + wiki/<repo-slug>/ for their domain only |
| SRE | brief.md blast-radius section + implementation-options.md (architecture decision only) + ops constraints |
| QA | brief.md acceptance-criteria section + implementation-options.md (test surface only) |
| Engineering BR | The artifact being challenged only (impl OR ops OR qa — not all three at once) |

TPM prints: `📋 TPM → scoped instruction written: instructions/<role>-<phase>.md ([N] files included)`

**Files changed:** `commands/brocode.md` — instruction writing section per role in both INVESTIGATE and SPEC flows.

---

## Mechanism 2: Quick Reference Headers

**Location:** `agents/tpm.md`, `agents/tech-lead.md`, `commands/brocode.md`

**Current state:** Agents must read 488–729 lines before reaching the section relevant to their current action.

**New rule:** Add `## Quick Reference` block immediately after the Role header (before all other sections). 15–20 lines max. Contains:
- Current responsibilities (3 bullet points)
- Key decision points (what triggers a D-NNN log entry)
- Artifact checklist (what this agent produces)
- Most-used flow paths (skip to section X for Y scenario)

**Format:**

```markdown
## Quick Reference
**Produces:** [artifact list]
**Key decisions to log:** [D-NNN triggers]
**Flow paths:**
- Investigate mode → skip to [## Investigate Flow]
- Spec mode → skip to [## Spec Flow]
- Develop mode → skip to [## Develop Flow]
**Read in full when:** [conditions requiring full file read]
```

Agents on routine dispatches read Quick Reference + their specific flow section only. Full file read only when Quick Reference says so (e.g., "Read in full when: first run, revise mode, or BR escalation").

**Files changed:** `agents/tpm.md`, `agents/tech-lead.md`, `commands/brocode.md`

---

## Mechanism 3: Thread Summarization

**Location:** `agents/tpm.md` — Post-BR-Round section.

**Current state:** Thread files in `threads/<topic>.md` grow unbounded. On long runs with multiple BR rounds, threads exceed 100+ lines. Every agent re-reads the full thread on next dispatch.

**New rule:** After each BR round completes, TPM checks all thread files touched in that round. For any thread > 50 lines:

1. Read the full thread
2. Append a `## Summary (as of Round N)` block at the top of the Discussion section
3. Summary is 5–8 bullet points: key positions, blockers raised, decisions made, open questions
4. Mark with: `<!-- summarized by TPM after BR round N -->`
5. Full thread content preserved below summary

On next agent dispatch, instruction file tells agent: "Read threads/<topic>.md Summary section only unless you need full context."

**Trigger:** Thread file > 50 lines after any BR round completion.

**Files changed:** `agents/tpm.md` — Post-BR-Round block; `commands/brocode.md` — instruction file writing rule (tell agents to read Summary only).

---

## Mechanism 4: Wiki Compaction

**Location:** `agents/tpm.md` — Post-Run section (fires after ADR extraction, before COMPLETE log entry).

**Current state:** `~/.brocode/wiki/<repo-slug>/` files grow with each scan. `overview.md` + `patterns.md` + `conventions.md` combined can exceed 500 lines after 3–4 runs on the same repo. Agents re-read the full wiki on every run.

**New rule:** After ADR extraction, TPM checks each `~/.brocode/wiki/<repo-slug>/` directory:

1. If `overview.md` + `patterns.md` + `conventions.md` combined > 300 lines:
   - Read all three files
   - Write compacted versions in place keeping:
     - Stack (language, framework, key deps + versions)
     - Key architectural patterns (monorepo/single-service, service boundaries)
     - Naming conventions (file naming, function naming, module naming)
     - Test runner + test file location pattern
     - Known gotchas (any `<!-- keep -->` tagged lines)
   - Drop: verbose examples, redundant sections, entries with `updated_at` > 30 days ago
   - Append `<!-- compacted by TPM YYYY-MM-DD, N lines removed -->` at top of overview.md
2. Update `~/.brocode/wiki/log.md` with compaction entry: `[date] TPM compacted <repo-slug> (N→M lines)`

**Preserve:** Any line tagged `<!-- keep -->` is never removed by compaction.
**Never compact** `test-strategy.md` or `dependencies.md` — these are structural, not narrative.

**Files changed:** `agents/tpm.md` — Post-Run section.

---

## Mechanism 5: Live TodoWrite Tracking

**Location:** `agents/tpm.md` — every phase transition; `commands/brocode.md` — flow steps.

**Current state:** No live progress visibility. User has no way to see what brocode is doing mid-run without reading terminal output.

**New rule:** TPM calls `TodoWrite` at every phase transition to maintain a live task list visible in the IDE. One todo item per active agent/artifact. States: `pending` → `in_progress` → `completed`.

**INVESTIGATE flow todos:**
```
[ ] Tech Lead — dispatched: reading repos
[ ] Backend — investigating [domain]
[ ] SRE — blast radius assessment
[ ] QA — failing test identification
[ ] Tech Lead — synthesizing investigation.md
[ ] Engineering BR — review round N
[ ] Tech Lead — writing engineering-spec.md + tasks.md
[ ] Engineering BR — final check
[ ] ADR extraction
```

**SPEC flow todos:**
```
[ ] PM — writing product-spec.md
[ ] Designer — writing ux.md
[ ] Product BR — review round N
[ ] [GATE] Engineering track unlocked
[ ] Tech Lead — dispatched: implementation options
[ ] Backend / Frontend / Mobile / SRE / QA — parallel investigation
[ ] Tech Lead — synthesizing implementation-options.md
[ ] Engineering BR — review round N
[ ] Tech Lead — writing engineering-spec.md + tasks.md
[ ] Engineering BR — final check
[ ] ADR extraction
```

**DEVELOP flow todos:**
```
[ ] [domain] — worktree setup
[ ] [domain] — writing plan
[ ] Task N: [task name] — implementing
[ ] Task N: [task name] — spec review
[ ] Task N: [task name] — quality review
[ ] [domain] — finishing branch + PR
```

TPM marks each item `in_progress` immediately before dispatching that agent, `completed` immediately after artifact confirmed written. Items added dynamically as BR rounds are added (e.g., `Engineering BR — review round 2` added only if round 1 is challenged).

**Files changed:** `agents/tpm.md` — every dispatch block; `commands/brocode.md` — every flow step.

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| Thread < 50 lines | No summarization — full thread is cheap enough |
| Wiki dir doesn't exist yet | Skip compaction for that repo — first run always full scan |
| Wiki < 300 lines combined | Skip compaction — not worth the overhead |
| Agent needs full thread | Instruction file says "read full thread" for revision/hotfix runs |
| `<!-- keep -->` tagged wiki line | Never removed by compaction regardless of age |
| Tech Lead instruction file | Always includes full tpm-logs.md D-NNN section — Tech Lead is synthesizer, needs all decisions |

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `commands/brocode.md` | Modify | Add role-scoped include list to instruction file writing rules (Mechanism 1) |
| `commands/brocode.md` | Modify | Add Quick Reference header (Mechanism 2) |
| `commands/brocode.md` | Modify | Add "read Summary only" rule to instruction file format (Mechanism 3) |
| `agents/tpm.md` | Modify | Add Quick Reference header (Mechanism 2) |
| `agents/tpm.md` | Modify | Add thread summarization step in Post-BR-Round section (Mechanism 3) |
| `agents/tpm.md` | Modify | Add wiki compaction step in Post-Run section after ADR extraction (Mechanism 4) |
| `agents/tech-lead.md` | Modify | Add Quick Reference header (Mechanism 2) |
| `agents/tpm.md` | Modify | Add TodoWrite calls at every dispatch/completion point (Mechanism 5) |
| `commands/brocode.md` | Modify | Add TodoWrite calls at every flow step for all three modes (Mechanism 5) |

No new agent files. No new commands. No new dependencies.

---

## What Is Not In Scope

- Compressing the agent files themselves (Quick Reference is additive, not a rewrite)
- Automatic pruning of `.brocode/<id>/` run directories
- Cross-run thread deduplication
- Changing which model each agent uses

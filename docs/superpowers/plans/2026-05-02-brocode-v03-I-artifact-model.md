# brocode v0.3-I: Artifact Model + Role Handoff Schema + Evidence Files — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured `## Handoff` block to all sub-agent output formats. Add TPM validation rule (reject DONE reports without Handoff block). Create `evidence.md` for investigate + develop modes and `decisions.md` for spec mode. Update CLAUDE.md context directory structure.

**Architecture:** Additive edits to 7 agent files + tpm.md. Additive steps in 3 mode files (investigate.md, spec.md, develop.md). No new agent files.

**Tech Stack:** Markdown edits only.

**Dependency:** Run after Sub-project G (mode files must exist before adding steps to them).

---

### Task 1: Add Handoff block to tech-lead.md

**Files:**
- Modify: `agents/tech-lead.md`

- [ ] **Step 1: Read the file**

Read `agents/tech-lead.md`. Find the output format sections for `investigation.md` and `implementation-options.md`. These are the artifacts Tech Lead produces — Handoff block appended to each.

- [ ] **Step 2: Add Handoff block to investigation.md output format**

In the investigation.md output format section, after the last required section (`## Root Cause` or similar), add:

````markdown
## Handoff
**Role:** tech-lead
**Status:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
**Task:** investigation.md
**Files changed:**
- `.brocode/<id>/investigation.md` — investigation complete
**Tests run:** [test command from wiki] → [N/N pass | no tests applicable in investigate mode]
**Risks:** [any concern worth surfacing — or "none"]
**Decisions:** [D-NNN refs if any — or "none"]
**Next:** TPM — route to Engineering BR for review
````

- [ ] **Step 3: Add Handoff block to implementation-options.md output format**

Find the implementation-options.md output format section. After the last required section, add:

````markdown
## Handoff
**Role:** tech-lead
**Status:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
**Task:** implementation-options.md
**Files changed:**
- `.brocode/<id>/implementation-options.md` — options synthesized
**Tests run:** N/A — spec mode, no implementation yet
**Risks:** [any concern worth surfacing — or "none"]
**Decisions:** [D-NNN refs if any — or "none"]
**Next:** TPM — route to Engineering BR for review
````

- [ ] **Step 4: Commit**

```bash
git add agents/tech-lead.md
git commit -m "feat: add Handoff block to tech-lead.md output formats"
```

---

### Task 2: Add Handoff block to sre.md, qa.md, swe-backend.md, swe-frontend.md, swe-mobile.md

**Files:**
- Modify: `agents/sre.md`
- Modify: `agents/qa.md`
- Modify: `agents/swe-backend.md`
- Modify: `agents/swe-frontend.md`
- Modify: `agents/swe-mobile.md`

- [ ] **Step 1: Read each file**

Read each of the 5 agent files. Find the output format section or "Output" section in each. Identify the last section before any "Bar Raiser Response Protocol" block.

- [ ] **Step 2: Add Handoff block to sre.md (appended to sre.md output)**

In `agents/sre.md`, after the ops.md output template's last section, add:

````markdown
## Handoff
**Role:** sre
**Status:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
**Task:** sre.md
**Files changed:**
- `.brocode/<id>/sre.md` — ops analysis complete
**Tests run:** N/A — ops/infra analysis, no code changes
**Risks:** [key blast-radius or rollback concerns — or "none"]
**Decisions:** [D-NNN refs if any — or "none"]
**Next:** Tech Lead — synthesize into investigation.md or implementation-options.md
````

- [ ] **Step 3: Add Handoff block to qa.md (appended to test-cases.md output)**

In `agents/qa.md`, after the test-cases.md output template's last section, add:

````markdown
## Handoff
**Role:** qa
**Status:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
**Task:** test-cases.md
**Files changed:**
- `.brocode/<id>/test-cases.md` — test matrix complete
**Tests run:** N/A — test design phase, no implementation yet
**Risks:** [coverage gaps or untestable scenarios — or "none"]
**Decisions:** [D-NNN refs if any — or "none"]
**Next:** Tech Lead — route to Engineering BR for review
````

- [ ] **Step 4: Add Handoff block to swe-backend.md**

In `agents/swe-backend.md`, after the domain findings thread output section (the thread file the backend engineer writes), add:

````markdown
## Handoff
**Role:** swe-backend
**Status:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
**Task:** [thread file name or TASK-ID]
**Files changed:**
- [list each file changed with one-line description — or "none" for investigation mode]
**Tests run:** `[test command]` → [N/N pass | FAIL: reason]
**Risks:** [any concern worth surfacing — or "none"]
**Decisions:** [D-NNN refs if any — or "none"]
**Next:** Tech Lead — incorporate into synthesis
````

- [ ] **Step 5: Add Handoff block to swe-frontend.md**

Same structure as swe-backend.md, with role `swe-frontend`.

- [ ] **Step 6: Add Handoff block to swe-mobile.md**

Same structure as swe-backend.md, with role `swe-mobile`.

- [ ] **Step 7: Commit**

```bash
git add agents/sre.md agents/qa.md agents/swe-backend.md agents/swe-frontend.md agents/swe-mobile.md
git commit -m "feat: add Handoff block to sre, qa, swe-backend, swe-frontend, swe-mobile output formats"
```

---

### Task 3: Add Handoff validation to tpm.md

**Files:**
- Modify: `agents/tpm.md`

- [ ] **Step 1: Read the On ARTIFACT section**

Read `agents/tpm.md`. Find the `### On ARTIFACT produced` section in the Coordination Protocol.

- [ ] **Step 2: Add Handoff validation rule**

In the `### On ARTIFACT produced` section, add before the `Write: E-NNN · ARTIFACT · [agent]` line:

```
Before marking artifact complete, verify DONE report contains ## Handoff block.
If ## Handoff block missing:
  Re-dispatch sub-agent with: "Include ## Handoff block in your DONE report per agents/<role>.md"
  Max 1 retry — if still missing after retry, accept artifact and note in E-NNN ARTIFACT entry.
```

- [ ] **Step 3: Commit**

```bash
git add agents/tpm.md
git commit -m "feat: add Handoff block validation to tpm.md On ARTIFACT section"
```

---

### Task 4: Add evidence.md writing to investigate mode

**Files:**
- Modify: `skills/brocode/modes/investigate.md`

- [ ] **Step 1: Read investigate.md**

Read `skills/brocode/modes/investigate.md`. Find the post-run section (after Engineering BR final check approves engineering-spec.md + tasks.md, before ADR extraction).

- [ ] **Step 2: Add evidence.md writing step**

After the final Engineering BR approval and before the ADR extraction step, add:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add skills/brocode/modes/investigate.md
git commit -m "feat: add evidence.md writing step to investigate mode"
```

---

### Task 5: Add evidence.md writing to develop mode + decisions.md to spec mode

**Files:**
- Modify: `skills/brocode/modes/develop.md`
- Modify: `skills/brocode/modes/spec.md`

- [ ] **Step 1: Add evidence.md to develop mode**

Read `skills/brocode/modes/develop.md`. Find the post-run section (after all domain PRs created and worktrees cleaned up).

Add after the final `✅ TPM → <domain> PR raised, worktree cleaned up` step:

```markdown
**Write `.brocode/<id>/evidence.md`** (after all domains complete):

```markdown
# Implementation Evidence
**Run ID:** [id]

## Test Results
| Domain | Command | Result |
|--------|---------|--------|
| [backend] | [npm test] | [42/42 pass] |

## PR Links
| Domain | PR URL | Status |
|--------|--------|--------|
| [backend] | [url] | OPEN |

## Worktree Map
| Domain | Branch | Worktree path | Status |
|--------|--------|---------------|--------|
| [backend] | [brocode/<id>-backend] | [/path] | CLEANED UP |
```

TPM logs: `E-NNN · ARTIFACT · TPM` — evidence.md written, N domains complete
```

- [ ] **Step 2: Add decisions.md to spec mode**

Read `skills/brocode/modes/spec.md`. Find the post-run section (after ADR extraction, in the TPM post-run cleanup).

After ADR extraction, add:

```markdown
**Write `.brocode/<id>/decisions.md`** (extracted from tpm-logs.md):

Read all `### [D-NNN]` blocks from `tpm-logs.md`. Write to `.brocode/<id>/decisions.md`:

```markdown
# Decision Log
**Run ID:** [id]

[All D-NNN blocks from tpm-logs.md — copy each block in full]
```

This provides a standalone decisions reference without requiring tpm-logs.md traversal.

TPM logs: `E-NNN · ARTIFACT · TPM` — decisions.md written, N decisions extracted
```

- [ ] **Step 3: Commit**

```bash
git add skills/brocode/modes/develop.md skills/brocode/modes/spec.md
git commit -m "feat: add evidence.md to develop mode, decisions.md to spec mode post-run"
```

---

### Task 6: Update CLAUDE.md context directory structure

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read CLAUDE.md context directory structure**

Read `CLAUDE.md`. Find the `## Context directory structure` section showing the `.brocode/<id>/` tree.

- [ ] **Step 2: Add new artifact files to the tree**

Update the context directory structure to add:

```
  evidence.md           ← Tech Lead (investigate mode) / TPM (develop mode)
  decisions.md          ← TPM (spec mode) — D-NNN blocks extracted from tpm-logs.md
```

These should appear after `brocode.md` in the tree, before `instructions/`.

Also remove `ux.md` from the tree (deleted in Sub-project K). Update the PM line to:
```
  product-spec.md         ← PM — pRFC format incl. section 15 UX flows
```

Also update the br/product/ section: remove `ux-challenge-r1.md` and `ux-approved.md` entries.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: update CLAUDE.md context dir structure — add evidence.md + decisions.md, remove ux.md"
```

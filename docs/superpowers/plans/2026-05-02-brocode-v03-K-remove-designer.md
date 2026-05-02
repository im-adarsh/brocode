# brocode v0.3-K: Remove Designer Agent, PM Owns UX Flows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `agents/designer.md` entirely. PM produces `product-spec.md` with a new `## 15. UX Flows` section covering all personas, flows, screen states, error/empty/loading states. Remove all Designer dispatch and ux.md references from the orchestration flow.

**Architecture:** Delete designer.md, add section 15 template to pm.md, update tpm.md org chart + dispatch steps, update brocode.md spec flow, update CLAUDE.md roster. No new files.

**Tech Stack:** Markdown edits only.

---

### Task 1: Add section 15 UX Flows to pm.md output template + update responsibilities

**Files:**
- Modify: `agents/pm.md`

- [ ] **Step 1: Read the file**

Read `agents/pm.md` in full. Identify: (1) the Responsibilities list, (2) the Conversation Protocol section referencing Designer, (3) the Output Format — `product-spec.md` template (ends with `## Changes from BR Challenge`), (4) the Autonomous Decision Rules section.

- [ ] **Step 2: Update Responsibilities list**

In the Responsibilities section, replace:
```
- Converse with Designer to resolve cross-cutting concerns
```
with:
```
- Own the UX flows for every persona defined in the spec
```

Remove the Designer reference from the Conversation Protocol section. Replace the thread format example's `**Participants:** PM, Designer` with a general thread format (PM can thread with Tech Lead during engineering track). Update the section description: change "When you need to discuss something with Designer" to "When you need to raise a cross-cutting topic during the engineering track with Tech Lead".

- [ ] **Step 3: Add section 15 to the product-spec.md template**

In the Output Format section, after the `## 14. Competitor / Market Reference` section and before `## Changes from BR Challenge`, insert:

````markdown
---

## 15. UX Flows

### End-to-End Flow

```mermaid
flowchart TD
  %% Full system flow across ALL personas — entry points, decision nodes, error paths, terminal states
  %% Use subgraph per persona for clarity
  subgraph [Persona 1 name]
    A[Entry point] --> B[Key action]
    B --> C{Decision}
    C -- success --> D[Success state]
    C -- error --> E[Error state]
  end
  subgraph [Persona 2 name]
    D --> F[Receives event / notification]
  end
```

### [Persona 1: e.g., End User] — [Journey name from section 6]

| Step | User action | What they see | System state |
|------|-------------|---------------|-------------|
| 1 | [action] | [screen / component description] | [background state] |
| 2 | ... | ... | ... |

#### Error States
| Trigger | Message shown | Recovery CTA |
|---------|--------------|-------------|
| [network error] | [exact copy] | [retry button / redirect] |
| [session expired] | [exact copy] | [redirect to login] |
| [invalid input] | [inline validation copy] | [field highlight + helper text] |

#### Empty / Loading States
| Context | What user sees | CTA |
|---------|---------------|-----|
| First-time use | [message + illustration hint] | [primary CTA] |
| No results | [exact message] | [suggest action] |
| Loading list | skeleton screen | — |
| Submitting form | button spinner + disabled | — |

### [Persona 2: e.g., Ops / Admin]

[same structure — step table, error states, empty/loading states]

#### Admin Capabilities
| Action | Who can do it | UI surface | Confirmation required? |
|--------|--------------|------------|----------------------|
| [action] | [role] | [where in UI] | Yes / No |

### [Persona 3: e.g., Support Team]

| Tool | What they can see | What they can do | What they cannot do |
|------|------------------|-----------------|---------------------|
| [support portal] | [user state, recent actions] | [resend, reset] | [cannot modify live data] |

### Design Decisions
| Decision | Options considered | Chosen | Rationale |
|----------|--------------------|--------|-----------|
````

- [ ] **Step 4: Add UX-specific autonomous decision rules**

In the Autonomous Decision Rules section, add after existing rules:

```
- Error message copy not specified → write it following plain, direct tone
- Empty state not described → design one based on the feature context
- Loading state not specified → skeleton for lists, spinner for actions
- Admin UX not specified → always include a read-only monitoring view
- Support UX not specified → always include status lookup + audit trail view
```

- [ ] **Step 5: Update instruction template reference**

In Step 0 instruction file reference, update the description: `What to do: Read brief.md. Produce product-spec.md including all 15 sections. Section 15 (UX Flows) must cover every persona from section 5.`

Note: This is a comment in the agent file for TPM to reference when writing PM instruction files.

Add after the Step 0 block:

```
Section 15 (UX Flows) must cover every persona defined in section 5 with:
- E2E mermaid flowchart (all personas)
- Step-by-step interaction table per persona journey
- Error states table
- Empty / loading states table
Do not skip any persona. If a persona has no direct UI interaction, state that explicitly.
```

- [ ] **Step 6: Commit**

```bash
git add agents/pm.md
git commit -m "feat: add section 15 UX Flows to pm.md — PM now owns UX design"
```

---

### Task 2: Remove Designer from tpm.md org chart and dispatch steps

**Files:**
- Modify: `agents/tpm.md`

- [ ] **Step 1: Read the file**

Read `agents/tpm.md`. Note: (1) Org Structure block, (2) Terminal Progress Display emoji table, (3) Cross-Agent Routing table, (4) Stage Progress table in tpm-logs.md format, (5) Performance Summary table in E-015 COMPLETE entry, (6) any reference to "Designer", "ux.md", or "🎨".

- [ ] **Step 2: Update Org Structure**

In the Org Structure block, remove:
```
│   ├── Designer  ────────────── reports to Product Bar Raiser
```

Update the Product Track to:
```
└── Product Track
    ├── PM  ──────────────────── reports to Product Bar Raiser (owns product-spec.md incl. UX flows)
    └── Product Bar Raiser  ──── gates engineering track
```

- [ ] **Step 3: Remove Designer from Terminal Progress Display**

In the Terminal Progress Display emoji table, remove the Designer row:
```
| Designer | 🎨 | SRE | 🚨 |
```
(The SRE row stays — just remove the Designer entry.)

- [ ] **Step 4: Update Cross-Agent Routing table**

Remove:
```
| Design / UX intent question | Designer |
```

Add in its place:
```
| UX intent question | PM |
```

- [ ] **Step 5: Update Stage Progress table in log format**

In the Stage Progress table template inside tpm-logs.md format, remove:
```
| ux.md | Designer | ⏳ PENDING | — | — | — | awaiting PM approval |
```

- [ ] **Step 6: Update Performance Summary table in E-015 COMPLETE entry**

In the Performance Summary table template inside the E-015 COMPLETE entry, remove:
```
| Designer | ux.md | HH:MM | HH:MM | N min | N rounds | N min |
```

- [ ] **Step 7: Commit**

```bash
git add agents/tpm.md
git commit -m "feat: remove Designer from tpm.md org chart and log templates"
```

---

### Task 3: Remove Designer dispatch and ux.md references from brocode.md spec flow

**Files:**
- Modify: `commands/brocode.md`

- [ ] **Step 1: Read the spec flow section**

Read `commands/brocode.md` from the SPEC mode section. Note: (1) the Step 1 Product Track block dispatching PM and Designer, (2) Product BR loop referencing ux.md, (3) any `ux.md` filename occurrences.

- [ ] **Step 2: Remove Designer dispatch from spec flow**

In the SPEC mode Phase 1 (Product Track), find the block that dispatches both PM and Designer. Remove the Designer dispatch sub-block entirely. The PM dispatch block remains. Update any "both PM and Designer" language to "PM only".

- [ ] **Step 3: Update Product BR loop**

Product BR currently reviews `product-spec.md` and `ux.md` separately. Update to: Product BR reviews `product-spec.md` only (one artifact, one review loop). Remove all references to `ux.md` in the BR challenge and approval steps.

Update instruction to PM for BR revisions: PM revises `product-spec.md` including section 15 UX flows.

- [ ] **Step 4: Remove ux.md from gate condition**

Find the Product Gate opening condition. Remove `ux.md approved` from the gate check. Gate opens when `product-spec.md` is approved only.

- [ ] **Step 5: Update Tech Lead instruction reference**

In the Tech Lead dispatch step (after product gate opens), update `Files to read:` in the instruction template to remove `ux.md`. Tech Lead reads `product-spec.md` only — section 15 contains UX flows.

- [ ] **Step 6: Commit**

```bash
git add commands/brocode.md
git commit -m "feat: remove Designer dispatch from spec flow, PM owns ux flows in product-spec.md"
```

---

### Task 4: Delete designer.md and update CLAUDE.md

**Files:**
- Delete: `agents/designer.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Delete designer.md**

```bash
git rm agents/designer.md
```

- [ ] **Step 2: Update CLAUDE.md agent roster table**

Read `CLAUDE.md`. In the Agent roster table, remove the Designer row:
```
| `agents/designer.md` | Designer (UX / UI) — user flows, screen states, interaction design | Product |
```

- [ ] **Step 3: Update CLAUDE.md flow summary**

In the Flow summary, Spec mode section, remove:
```
Designer sub-agent → ux.md
```
Update PM line to:
```
PM sub-agent → product-spec.md (sections 1–15, includes UX flows)
```

Update `→ Product BR loop (max 3 rounds per artifact)` to reference only `product-spec.md`.

- [ ] **Step 4: Update context directory structure in CLAUDE.md**

In the context directory structure block, remove:
```
  ux.md                   ← Designer — UX flows + e2e mermaid per persona
```
Update the PM line:
```
  product-spec.md         ← PM — pRFC format incl. section 15 UX flows
```
Remove from br/product/:
```
      ux-challenge-r1.md    ← Product BR challenges on ux
      ux-approved.md
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: remove designer.md, update CLAUDE.md — PM owns UX flows in product-spec.md section 15"
```

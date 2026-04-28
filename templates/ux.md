---
template: ux
artifact: ux.md
producer: Designer
challenger: Product Bar Raiser
mode: spec
version_field: true
status_values: [DRAFT, REVISED, APPROVED]
required_sections: [end_to_end_flow, personas_covered, per_persona_flows, interaction_design_notes, design_decisions, consistency_check, open_questions_for_engineering]
ai_instructions: >
  Fill every [bracketed] placeholder with real content.
  Every persona from product-spec.md must have its own section — do not omit any.
  Every flow must have error states, empty states, and loading states — not just happy path.
  Ops/admin and support interfaces must be fully designed, not just mentioned.
  All message copy must be exact strings — no "show success message" placeholders.
  All mermaid diagrams must be complete with no empty blocks or placeholder comments.
  Append "## Changes from BR Challenge round <N>" on each revision.
---

# UX / UI Design
**Spec ID:** [id]
**Version:** [N]
**Status:** DRAFT | REVISED | APPROVED

## End-to-End Flow

```mermaid
flowchart TD
    subgraph Consumer["Consumer / End User"]
        A[Entry point] --> B[Key action]
        B --> C{Decision}
        C -- success --> D[Success state]
        C -- error --> E[Error state]
    end
    subgraph Merchant["Merchant / Partner"]
        D --> F[Merchant receives event]
    end
    subgraph Ops["Ops / Admin"]
        G[Monitor dashboard]
    end
    subgraph Support["Support Team"]
        H[Look up user state]
    end
```

## Personas Covered
| Persona | Section |
|---------|---------|
| [Persona 1] | [Section name] |
| [Persona 2] | [Section name] |
| [Persona 3: Ops / Admin] | [Section name] |
| [Persona 4: Support Team] | [Section name] |

---

## [Persona 1: e.g., End User / Consumer]

### Happy Path: [Journey name from requirements]

```mermaid
flowchart TD
    Start([Entry point]) --> Step1[First user action]
    Step1 --> Step2[Second user action]
    Step2 --> Decision{Condition}
    Decision -- success --> Success([Success state])
    Decision -- error --> ErrorState[Error state]
    ErrorState --> Recovery[Recovery action]
    Recovery --> Step2
```

#### Step-by-step
| Step | User action | What they see | System state |
|------|-------------|---------------|-------------|
| 1 | [action] | [screen / component description] | [background state] |
| 2 | ... | ... | ... |

### Error States
| Trigger | What user sees | CTA / Recovery |
|---------|---------------|----------------|
| Network error | [exact message copy] | Retry button |
| Session expired | [exact message copy] | Redirect to login |
| Invalid input | [exact inline validation message] | Field highlight + helper text |
| [Feature-specific error] | [exact message copy] | [action] |

### Empty States
| Context | What user sees | CTA |
|---------|---------------|-----|
| First-time use | [exact message + illustration hint] | [primary CTA] |
| No results | [exact message] | [suggest action] |
| Post-deletion | [exact message] | [undo / navigate away] |

### Loading / Async States
| Operation | Loading indicator | Duration threshold before showing | Timeout message |
|-----------|------------------|-----------------------------------|-----------------|
| Fetching list | Skeleton screen | 200ms | "Taking longer than expected…" |
| Submitting form | Button spinner + disabled | Immediate | [timeout message] |
| [Feature-specific op] | [indicator] | [Nms] | [message] |

---

## [Persona 2: e.g., Merchant / Partner]

### Happy Path: [Journey name from requirements]

```mermaid
flowchart TD
    Start([Entry point]) --> Step1[First user action]
    Step1 --> Success([Success state])
```

#### Step-by-step
| Step | User action | What they see | System state |
|------|-------------|---------------|-------------|
| 1 | [action] | [screen / component description] | [background state] |

### Error States
| Trigger | What user sees | CTA / Recovery |
|---------|---------------|----------------|
| [error] | [exact message copy] | [action] |

### Empty States
| Context | What user sees | CTA |
|---------|---------------|-----|
| First-time use | [exact message] | [primary CTA] |

### Loading / Async States
| Operation | Loading indicator | Duration threshold | Timeout message |
|-----------|------------------|-------------------|-----------------|
| [operation] | [indicator] | [Nms] | [message] |

---

## [Persona 3: e.g., Ops / Admin]

### Admin Interface

```mermaid
flowchart TD
    Login([Admin login]) --> Dashboard[Dashboard]
    Dashboard --> ManageFeature[Manage feature]
    ManageFeature --> Create[Create]
    ManageFeature --> Edit[Edit]
    ManageFeature --> Disable[Disable]
    Disable --> Confirm{Confirm?}
    Confirm -- yes --> Disabled([Feature disabled])
    Confirm -- no --> Dashboard
```

#### Capabilities
| Action | Who can do it | UI surface | Confirmation required? |
|--------|--------------|------------|----------------------|
| [e.g., disable feature] | [role] | [where in UI] | Yes — modal with impact summary |
| [e.g., view audit log] | [role] | [where in UI] | No |
| [e.g., export data] | [role] | [where in UI] | No |

#### States & Feedback
| Trigger | What admin sees | CTA / Recovery |
|---------|----------------|----------------|
| [error] | [exact message copy] | [action] |

#### Empty States
| Context | What admin sees | CTA |
|---------|----------------|-----|
| No items | [exact message] | [primary CTA] |

#### Loading States
| Operation | Loading indicator | Duration threshold | Timeout message |
|-----------|------------------|-------------------|-----------------|
| [operation] | [indicator] | [Nms] | [message] |

---

## [Persona 4: e.g., Support Team]

### Support Interface

| Tool | What they can see | What they can do | What they cannot do |
|------|------------------|-----------------|---------------------|
| [support portal] | [user's state, recent actions, error codes] | [resend, reset state] | [cannot modify live data] |

#### Support Lookup Flow
| Step | Support action | What they see |
|------|---------------|---------------|
| 1 | Search by user ID / email | [user profile + feature state] |
| 2 | View audit trail | [timestamped action log] |
| 3 | Trigger resolution action | [confirmation + result] |

---

## Interaction Design Notes

### Notifications & Feedback
| Event | Channel | Message copy | Timing |
|-------|---------|-------------|--------|
| [e.g., action completed] | In-app toast | "[exact copy]" | Immediate |
| [e.g., async process done] | Push notification | "[exact copy]" | Within 1 min |
| [e.g., approval needed] | Email + in-app | "[exact copy]" | Immediate |

### Navigation & Information Architecture
[How this feature fits into existing nav. New entry points, deep links, back-navigation behavior.]

---

## Design Decisions
| Decision | Options considered | Chosen | Rationale |
|----------|--------------------|--------|-----------|
| [decision] | A: [option] / B: [option] | [chosen] | [why] |

## Consistency Check
### Patterns Followed
- [existing pattern this design matches]

### Deviations
- [deviation]: [justification — why breaking the pattern is justified]

## Competitor / Reference Patterns
[If PM referenced competitors: UX patterns worth adopting or explicitly avoiding]
[Product BR will validate these via web research]

## Open Questions for Engineering
| Question | Who to ask | Blocks |
|----------|-----------|--------|
| [question] | Backend / Frontend | [what it blocks] |

## Changes from BR Challenge
[Added on each revision — address each BR challenge by number C1, C2, ...]

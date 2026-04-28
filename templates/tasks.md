---
template: tasks
artifact: tasks.md
producer: Tech Lead
challenger: Engineering Bar Raiser
mode: spec
version_field: false
status_values: []
required_sections: [backend_tasks, web_tasks, mobile_tasks]
ai_instructions: >
  Fill every [bracketed] placeholder with real content.
  Zero vague tasks — "implement the auth flow" is not a task.
  Every task must have exact file paths and concrete function signatures.
  Every task must map to at least one AC from product-spec.md.
  Dependencies must be explicit — no implicit ordering.
  Backend / Web / Mobile sections: only include sections relevant to this feature.
  Omit sections for domains not touched by this feature.
---

# Implementation Tasks
**Spec ID:** [id]
**Status:** 0 / N complete

---

## Backend Tasks

### TASK-BE-01: [Short title — e.g., "Add token exchange endpoint"]
**Domain:** backend
**Status:** [ ]
**Depends on:** none
**Satisfies AC:** AC-1, AC-3

**Files:**
- Create: `src/api/[domain]/[handler].ts`
- Modify: `src/api/routes.ts:[line range]`
- Test: `tests/api/[domain]/[handler].test.ts`

**Implementation:**
- Endpoint: `[METHOD] /api/[path]`
- Handler signature: `async function [handlerName](req: Request): Promise<[ResponseType]>`
- Validates: `{ [field]: [type] }` — returns 400 if [condition]
- Returns: `{ [field]: [type], [field]: [type] }`
- Error cases: 400 [condition], 401 [condition], 500 [condition]

**Test cases from QA:**
- Happy path: [input] → [expected output]
- [Error case]: [input] → [expected status + error code]
- [Edge case]: [input] → [expected behavior]

---

### TASK-BE-02: [Short title — e.g., "Add DB migration for new column"]
**Domain:** backend
**Status:** [ ]
**Depends on:** none
**Satisfies AC:** AC-2

**Files:**
- Create: `migrations/[timestamp]_[migration_name].sql`
- Modify: `src/db/schema.ts` (add type definition for new column)
- Test: `tests/db/migration.test.ts` (verify migration runs cleanly and rolls back)

**Implementation:**
- Migration: add column `[col]` to `[table]` — nullable first, then NOT NULL after backfill
- Safe under concurrent writes: see migration in `engineering-spec.md` Section 5
- Rollback SQL: `ALTER TABLE [table] DROP COLUMN [col];`

**Test cases from QA:**
- Migration runs successfully on empty DB
- Migration runs successfully on seeded DB
- Rollback reverts schema cleanly

---

### TASK-BE-03: [Short title]
**Domain:** backend
**Status:** [ ]
**Depends on:** TASK-BE-01, TASK-BE-02
**Satisfies AC:** AC-4

**Files:**
- Modify: `src/services/[service].ts`
- Test: `tests/services/[service].test.ts`

**Implementation:**
- Function: `async function [functionName]([param]: [type]): Promise<[ReturnType]>`
- Logic: [precise description of what it does]
- Error handling: [specific error cases and how they propagate]

**Test cases from QA:**
- [scenario]: [expected behavior]

---

## Web Tasks

### TASK-WEB-01: [Short title — e.g., "Add checkout form component"]
**Domain:** web / frontend
**Status:** [ ]
**Depends on:** TASK-BE-01
**Satisfies AC:** AC-1, AC-5

**Files:**
- Create: `src/components/[Feature]/[Component].tsx`
- Create: `src/components/[Feature]/[Component].test.tsx`
- Modify: `src/pages/[page].tsx` (add new component)
- Modify: `src/api/client.ts` (add API call for new endpoint)

**Implementation:**
- Component: `function [ComponentName]({ [prop]: [type] }: [PropsType]): JSX.Element`
- State: `[stateName]: [type]` — managed via `useState` / `useReducer` / context
- API call: `POST /api/[path]` — on [trigger event]
- Loading state: [spinner / skeleton / disabled button]
- Error state: [inline error / toast / modal]
- Empty state: [what user sees when no data]

**Test cases from QA:**
- Renders with [props] → [expected UI state]
- [user action] → [expected state change + API call]
- API error → [expected error display]

---

### TASK-WEB-02: [Short title]
**Domain:** web / frontend
**Status:** [ ]
**Depends on:** TASK-WEB-01
**Satisfies AC:** AC-2

**Files:**
- Modify: `src/components/[Component].tsx`
- Test: `src/components/[Component].test.tsx`

**Implementation:**
[precise description]

**Test cases from QA:**
[test scenarios]

---

## Mobile Tasks

### TASK-MOB-01: [Short title — e.g., "Add notification permission flow for iOS"]
**Domain:** mobile
**Status:** [ ]
**Depends on:** TASK-BE-02
**Satisfies AC:** AC-6

**Files:**
- Create: `src/screens/[Feature]/[Screen].[tsx|swift|kt]`
- Modify: `src/navigation/[Navigator].[tsx|swift|kt]`
- Test: `__tests__/[Feature]/[Screen].test.[tsx|swift|kt]`

**Implementation:**
- Screen: `[ScreenName]` — entry from [navigation route]
- Platform differences: [iOS: [detail] | Android: [detail]]
- Offline behavior: [what happens with no network]
- Payload size: [expected request/response size — relevant for mobile data]

**Test cases from QA:**
- [scenario] → [expected behavior]
- Offline: [expected fallback]

---

## Shared / Config Tasks

### TASK-CFG-01: [Short title — e.g., "Configure feature flag"]
**Domain:** config
**Status:** [ ]
**Depends on:** none
**Satisfies AC:** (ops requirement)

**Files:**
- Modify: `config/feature-flags.[json|ts|yaml]`
- Modify: `terraform/[env]/flags.tf` *(if infra-managed)*

**Implementation:**
- Flag name: `[flag_name]`
- Default: disabled in production, enabled in staging
- Rollout: [gradual % / all-or-nothing / per-tenant]

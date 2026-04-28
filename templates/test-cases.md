---
template: test-cases
artifact: test-cases.md
producer: QA
challenger: Engineering Bar Raiser (via Tech Lead)
mode: spec_or_investigate
version_field: true
status_values: [DRAFT, REVISED, APPROVED]
required_sections: [personas_covered, per_persona_flows, cross_flow_tests, performance_tests, regression_tests, coverage_gaps]
ai_instructions: >
  Fill every [bracketed] placeholder with real content.
  Every test must have exact setup code, action code, and assertion code — no descriptions without code.
  Every AC from product-spec.md must have at least one test, traced to the persona it belongs to.
  Every error path from ux.md must have a test with exact assertion.
  No TODO comments in test code — write the actual test or explicitly move it to coverage_gaps.
  Load tests must use realistic data volumes, not 1-row toy data.
  Security tests must cover auth boundaries and data isolation between personas.
  Append "## Changes from BR Challenge round <N>" on each revision.
---

# Test Cases
**Spec ID:** [id]
**Version:** [N]
**Status:** DRAFT | REVISED | APPROVED

---

## Personas Covered
| Persona | Section | ACs covered |
|---------|---------|-------------|
| [Persona 1: End User / Consumer] | Flow 1 | AC-1, AC-2, AC-3 |
| [Persona 2: Merchant / Partner] | Flow 2 | AC-4, AC-5 |
| [Persona 3: Ops / Admin] | Flow 3 | AC-6 |
| [Persona 4: Support Team] | Flow 4 | AC-7 |

---

## Flow 1: [End User / Consumer]

### Coverage Matrix
| AC | Scenario | Unit | Integration | E2E | Status |
|----|----------|------|-------------|-----|--------|
| AC-1 | Happy path | TC-01 | TC-05 | TC-09 | COVERED |
| AC-2 | Empty state | TC-02 | — | TC-10 | COVERED |
| AC-3 | Error: invalid input | TC-03 | TC-06 | — | COVERED |

### Happy Path

#### TC-01: [Name — describes exactly what this test verifies]
**Type:** Unit | Integration | E2E
**Scenario:** [Exact situation — what the user is doing, what state the system is in before the test]
**Setup:**
```[lang]
// Exact setup code — seed data, mocks, preconditions
const user = await createTestUser({ role: 'consumer', tenantId: 'test-tenant' });
const item = await seedItem({ userId: user.id, status: 'active' });
```
**Action:**
```[lang]
// Exact call or simulated user interaction
const response = await request(app)
  .post('/api/[endpoint]')
  .set('Authorization', `Bearer ${user.token}`)
  .send({ [field]: [value] });
```
**Expected:**
```[lang]
// Exact assertions — response shape, state changes, side effects
expect(response.status).toBe(200);
expect(response.body).toMatchObject({ [field]: [expectedValue] });
const dbRecord = await db.[table].findOne({ where: { id: response.body.id } });
expect(dbRecord.[field]).toBe([expectedValue]);
```
**Covers:** AC-1

### Error Paths

#### TC-02: [Name — e.g., "rejects request with invalid input"]
**Type:** Unit | Integration | E2E
**Scenario:** [What invalid state or input triggers this error]
**Setup:**
```[lang]
// Setup
```
**Action:**
```[lang]
// Action that triggers error
```
**Expected:**
```[lang]
expect(response.status).toBe([4xx or 5xx]);
expect(response.body.error).toBe('[exact error code]');
expect(response.body.message).toBe('[exact user-facing message]');
```
**Covers:** AC-[N]

### Edge Cases

#### TC-03: [Name — e.g., "handles concurrent writes idempotently"]
**Type:** Integration
**Scenario:** [Unusual but realistic variation — concurrent access, boundary values, offline state]
**Setup:**
```[lang]
// Setup
```
**Action:**
```[lang]
// Concurrent or boundary action
const [result1, result2] = await Promise.all([
  callA(),
  callB(),
]);
```
**Expected:**
```[lang]
// Assert exactly one succeeds, one fails gracefully, no data corruption
```
**Covers:** AC-[N]

### Security Tests

#### TC-04: [Name — e.g., "cannot access another user's data"]
**Type:** Integration
**Scenario:** [Auth bypass or data isolation violation attempt]
**Setup:**
```[lang]
const ownerUser = await createTestUser({ tenantId: 'tenant-a' });
const attackerUser = await createTestUser({ tenantId: 'tenant-b' });
const resource = await createResource({ userId: ownerUser.id });
```
**Action:**
```[lang]
const response = await request(app)
  .get(`/api/resource/${resource.id}`)
  .set('Authorization', `Bearer ${attackerUser.token}`);
```
**Expected:**
```[lang]
expect(response.status).toBe(404); // 404 not 403 — don't leak existence
```
**Covers:** AC-[N]

---

## Flow 2: [Merchant / Partner]

### Coverage Matrix
| AC | Scenario | Unit | Integration | E2E | Status |
|----|----------|------|-------------|-----|--------|
| AC-4 | Happy path | TC-10 | TC-14 | TC-18 | COVERED |

### Happy Path

#### TC-10: [Name]
**Type:** Unit | Integration | E2E
**Scenario:** [exact situation]
**Setup:**
```[lang]
// setup
```
**Action:**
```[lang]
// action
```
**Expected:**
```[lang]
// assertions
```
**Covers:** AC-4

### Error Paths

#### TC-11: [Name]
[same structure]

### Edge Cases

#### TC-12: [Name]
[same structure]

---

## Flow 3: [Ops / Admin]

### Coverage Matrix
| AC | Scenario | Unit | Integration | E2E | Status |
|----|----------|------|-------------|-----|--------|
| AC-6 | Admin creates/edits/disables feature | TC-20 | TC-24 | — | COVERED |

### Happy Path

#### TC-20: [Name — e.g., "admin can disable feature via ops panel"]
**Type:** Integration
**Scenario:** [Admin action and its effect on the system]
**Setup:**
```[lang]
// setup
```
**Action:**
```[lang]
// admin action
```
**Expected:**
```[lang]
// state change + audit log entry
```
**Covers:** AC-6

---

## Flow 4: [Support Team]

### Coverage Matrix
| AC | Scenario | Unit | Integration | E2E | Status |
|----|----------|------|-------------|-----|--------|
| AC-7 | Support can look up user state | TC-30 | — | — | COVERED |

### Happy Path

#### TC-30: [Name — e.g., "support can look up user state and audit trail"]
**Type:** Integration
**Scenario:** [Support agent looks up specific user]
**Setup:**
```[lang]
// setup
```
**Action:**
```[lang]
// support lookup
```
**Expected:**
```[lang]
// user state visible, audit trail present, no PII leaked beyond support role
```
**Covers:** AC-7

---

## Cross-Flow Tests
[Tests that span multiple personas — e.g., merchant creates X, consumer sees it]

#### TC-CROSS-01: [Name — e.g., "consumer sees merchant's published item"]
**Type:** E2E
**Scenario:** [Multi-persona sequence]
**Setup:**
```[lang]
// setup both personas
```
**Action:**
```[lang]
// merchant action → consumer observation
```
**Expected:**
```[lang]
// cross-persona assertion
```
**Covers:** AC-[N], AC-[M]

---

## Performance Tests

#### TC-PERF-01: [Name — e.g., "checkout endpoint meets p99 SLO at 1000 req/s"]
**SLO:** p99 < [Nms] at [N] req/s sustained for [N] minutes
**Tool:** k6 | Locust | JMeter
**Data:** [N] existing users, [N] items — not synthetic uniform data
**Scenario:**
```javascript
// k6 example — adapt for chosen tool
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(99)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.post('[endpoint]', JSON.stringify({ [field]: [value] }), {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
}
```
**Pass criteria:** p99 < [Nms], error rate < [N]%, no memory leak over duration

---

## Regression Tests
| Test | What existing behavior is protected | Test case reference |
|------|-------------------------------------|---------------------|
| TC-REG-01 | [existing behavior that must not break] | TC-[N] |

---

## Not Testable / Manual Only
| Scenario | Why not automatable | Manual procedure |
|----------|--------------------|--------------------|
| [scenario] | [reason] | [steps] |

---

## Coverage Gaps
| AC or scenario | Not covered | Risk if untested | Reason |
|----------------|------------|------------------|--------|
| [AC-N or scenario] | [what's missing] | [Low / Medium / High] | [why gap exists] |

---

## Changes from BR Challenge
[Added on each revision — address each BR challenge by number C1, C2, ...]

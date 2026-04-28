---
template: ops
artifact: ops.md
producer: SRE
challenger: Engineering Bar Raiser (via Tech Lead)
mode: spec_or_investigate
version_field: true
status_values: [DRAFT, REVISED, APPROVED]
required_sections: [observability, blast_radius, rollback_plan, slo_impact, runbook, pre_deploy_checklist, operational_risk]
ai_instructions: >
  Fill every [bracketed] placeholder with real content.
  Rollback plan must be executable commands — not theory. "git revert" alone is not a plan.
  Every new code path must have a metric.
  Alert thresholds must be grounded in actual SLO values — not invented numbers.
  Blast radius must be consistent with Tech Lead's failure analysis and implementation complexity.
  Pre-deploy checklist items must be actionable — no vague items.
  Append "## Changes from BR Challenge round <N>" on each revision.
---

# Operations Plan
**Spec ID:** [id]
**Version:** [N]
**Status:** DRAFT | REVISED | APPROVED

---

## Observability

### Metrics to Add
| Metric name | Type | Description | Alert threshold | Severity |
|-------------|------|-------------|-----------------|----------|
| [metric_name_snake_case] | counter / gauge / histogram | [what it measures] | [threshold grounded in SLO] | P0 / P1 / P2 |

### Log Lines to Add
| Location (file:function) | Log level | Message template | Required fields |
|--------------------------|-----------|-----------------|-----------------|
| [service/handler.ts:handleRequest] | INFO / WARN / ERROR | `[event] [outcome] [context]` | user_id, request_id, duration_ms |

### Dashboard Changes
[Link to existing dashboard or describe new panels needed. If no dashboard exists, say so explicitly.]

---

## Blast Radius

- **Failure scope:** [% users affected, specific features, specific regions or data centers]
- **Degradation mode:** [graceful degradation / hard fail / silent data corruption]
- **Unrelated systems affected:** [list affected systems or NONE]
- **Traffic percentage at risk:** [N% of total requests / specific user segment]
- **Data at risk:** [rows / records / none — specify if any data could be corrupted]

---

## Rollback Plan

### With Feature Flag
```bash
# Exact command to disable feature flag
[feature_flag_tool] disable [flag_name] --env production --reason "[incident_id]"

# Verify flag is disabled
[feature_flag_tool] status [flag_name] --env production

# Confirm traffic stopped hitting new code path
[monitoring_command or dashboard link]
```

### Without Feature Flag
```bash
# Step 1: Identify SHA to revert to
git log --oneline -10

# Step 2: Revert the specific commit
git revert [sha] --no-edit
git push origin main

# Step 3: Deploy the revert
[deploy_command] --env production --sha $(git rev-parse HEAD)

# Step 4: Verify deployment
[health_check_command or monitoring link]
```

### Data Rollback
[If schema migration was involved, provide exact SQL to reverse. If no data rollback needed, write NONE.]

```sql
-- Only if migration needs reversal:
ALTER TABLE [table] DROP COLUMN [col];
-- or
UPDATE [table] SET [col] = NULL WHERE [condition];
```

**Rollback tested in staging:** [ ] Yes  [ ] No — must be YES before prod deploy

---

## SLO Impact

| SLO | Current target | Current baseline | Expected post-deploy | Worst-case if rollback needed |
|-----|---------------|-----------------|----------------------|-------------------------------|
| p99 latency | [< Nms] | [Nms] | [Nms] | [Nms] |
| Error rate | [< N%] | [N%] | [N%] | [N%] |
| Availability | [N%] | [N%] | [N%] | [N%] |

---

## Runbook

### Alert: [AlertName]
**Severity:** P0 / P1 / P2
**Trigger:** [Exact condition — metric name + threshold + duration, e.g., "error_rate > 5% for 2 consecutive minutes"]
**First response (execute in order):**
1. `[exact command to check current state]`
2. `[exact command to identify scope]`
3. `[decision: disable flag vs. rollback — what to check first]`
4. `[exact rollback command if needed]`

**Escalation:** [Who to page, after how long, how — PagerDuty policy / Slack channel]

### Alert: [AlertName2] *(add one runbook section per alert)*
**Severity:** P0 / P1 / P2
**Trigger:** [condition]
**First response:**
1. [step]

**Escalation:** [who / when]

---

## Pre-Deploy Checklist
- [ ] Schema migration tested on staging with production-scale data volume
- [ ] All new metrics instrumented and visible in staging dashboard
- [ ] All alerts configured with verified thresholds (tested by triggering in staging)
- [ ] Rollback procedure tested end-to-end in staging
- [ ] Runbook written, linked from alert, and reviewed by on-call
- [ ] Feature flag configured (if applicable) — default state confirmed
- [ ] Dependent on-call teams notified: [list team names]
- [ ] Load test run at expected traffic: [tool + result]
- [ ] [Feature-specific item]

---

## Operational Risk

**Overall risk:** Low | Medium | High | Critical

**Reasoning:** [Why this risk level — reference specific blast radius, SLO impact, rollback complexity, or data risk. Be specific.]

**Mitigations in place:**
- [mitigation 1]
- [mitigation 2]

---

## Changes from BR Challenge
[Added on each revision — address each BR challenge by number C1, C2, ...]

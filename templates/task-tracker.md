---
slug: <domain>-<short-feature-id>
brocode_id: <yyyy-mm-dd-hhmm>
domain: backend | web | mobile | infra | qa
worktree: <absolute-path>
branch: brocode/<spec-id>-<domain>
pr_url: <https://github.com/.../pull/N>
# status enum: queued | coding | pr-open | ci-fixing | review-addressing | rebasing | merging | merged | escalated
status: queued
created_at: <ISO-8601>
last_action_at: <ISO-8601>
ci_retries: 0
review_retries: 0
idle_ticks: 0
escalation_reason: null
---
<!-- Read by babysitter (skills/brocode/modes/_shared/babysitter.md) at every wakeup. Path: ~/.brocode/code/task-<slug>.md -->

## Log
- [<ISO-8601>] task created from .brocode/<brocode_id>/tasks.md#<task-id>

## Comments
<!-- one row per PR comment; populated by babysitter wakeups -->
- id=<n> author=<login> severity=<must|good|nit> resolved=<true|false> body_excerpt="<first 80 chars>"

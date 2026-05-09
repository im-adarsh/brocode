# Assessment <id>
<!-- Read by Tech Lead at assess-write time. Output path: .brocode/<id>/assessment.md -->
**Input:** <path|url>
**Type:** <product-spec | engineering-spec | code | comparison>
**Overall:** N.N/10 — <READY | READY-WITH-FIXES | NOT-READY>
**Threshold:** N (configured) → <PASS | FAIL>

## Scores
| Dimension | Score | Verdict |
|-----------|-------|---------|
| <dim>     | N     | <strong\|adequate\|weak> |

## Strengths
- <bullet, 3–7 items>

## Need Improvement
- <bullet, each item: what is weak, why, how to fix>

## Change Profile
<!-- code/PR mode only; otherwise omit section -->
- **change_type:** <feature | bugfix | refactor | perf | security | docs>
- **risk_band:** <low | medium | high | critical>
- **rationale:** <one line: what drove the risk band>

## Pattern Deviations
<!-- code mode only; otherwise omit section -->
- file:line — observed X, team pattern Y, fix: Z

## Comparison
<!-- multi-spec mode only; otherwise omit section -->
| Spec | Overall | Winner-on |
|------|---------|-----------|
| A    | N.N     | <dims>    |

## Recommended Next Step
- <one line: revise spec | run /brocode develop | escalate to user>

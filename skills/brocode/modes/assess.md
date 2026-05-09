# brocode: assess mode
<!-- Loaded by skills/brocode/SKILL.md when input matches: assess / rate / score / "compare specs" -->

### `assess` / `rate` / `score`

Inputs:

- 1 path → single artifact (auto-detect type)
- 2+ paths to `.md` → comparison
- `code <path|repo|pr-url>` → code rating
- bare path that resolves to a directory or git repo → code rating

If input is empty, ask: "What to assess? Path to spec, multiple specs, or `code <path>`."

### Auto-detect

| Detection | Type |
|---|---|
| 1 `.md` file with sections labeled `## 1.` through `## 15.` | product-spec |
| 1 `.md` file with `# Engineering Spec` header | engineering-spec |
| 2+ `.md` paths | comparison |
| 1 path to dir or git repo | code (local) |
| URL matching `github.com/.../pull/N` | code on PR |

### Pre-flight

- Read `~/.brocode/repos.json` for `min_score` and `dimension_weights` of relevant repo (if applicable). Defaults: `min_score=7`, equal weights.
- Mint a brocode `<id>` if none active: `assess-<yyyymmdd-hhmm>`. Create `.brocode/<id>/`.

### Dispatch (Tech Lead)

Print: `🧪 Tech Lead → starting assessment of <input>`

Write `.brocode/<id>/instructions/tech-lead-assess.md` with:

- Input path(s) and detected type
- Rubric to apply (spec dims OR code dims)
- Threshold and weights from repos.json
- Output path: `.brocode/<id>/assessment.md`

Dispatch Tech Lead sub-agent (`agents/tech-lead.md`):

**Spec input:** Tech Lead reads spec, scores each dim 1–10. Dispatch domain SWE only if spec references domain-specific tech needing feasibility verification. Synthesize → write assessment.md.

**Code input:** Tech Lead identifies files in scope. Dispatch in parallel:

- Backend SWE for backend files
- Frontend SWE for web files
- Mobile SWE for mobile files
- SRE for infra files
- QA for test files

Each sub-agent returns domain-scoped dim scores + findings + pattern deviations (file:line — observed X, team pattern Y, fix: Z).

Tech Lead synthesizes into single assessment.md.

**Comparison input:** Run rubric per spec, build side-by-side comparison table, pick winner with delta rationale, write assessment.md with `## Comparison` section.

### Scoring rubric

**Spec dimensions (1–10 each):**

- Clarity — intent unambiguous, terms defined
- Completeness — required sections filled, no TBDs
- Feasibility — implementable with current stack
- Testability — acceptance criteria measurable
- Risk-coverage — failure modes, rollback, blast radius

**Code dimensions (1–10 each):**

- Pattern-adherence — matches team patterns from code + CLAUDE.md
- Readability — naming, structure, comments where needed
- Test-coverage — present, meaningful
- Maintainability — module boundaries, coupling
- Security — input validation, auth, secret handling

**Code/PR mode also emits (single label each, not 1–10):**

- `change_type` ∈ {feature, bugfix, refactor, perf, security, docs} — diff intent classification
- `risk_band` ∈ {low, medium, high, critical} — derived from blast radius (files touched), test-coverage delta, security score, lines changed:
  - critical: security score < 5 OR > 1000 lines changed OR auth/payment paths touched
  - high: security score < 7 OR > 300 lines OR test-coverage score < 5
  - medium: > 100 lines OR pattern-adherence < 6
  - low: everything else

These are written to a `## Change Profile` section in assessment.md, only for code/PR inputs.

**Overall = weighted average.** Default equal weights. `dimension_weights` from `~/.brocode/repos.json` override.

**Pattern source for code mode:** primary truth = live code analysis (grep + read targeted files). High-weight secondary = `CLAUDE.md` of the repo. Cache for orientation = `~/.brocode/wiki/<repo-slug>/` (existing knowledge base). Cache is not the scoring source.

### Output

Write `.brocode/<id>/assessment.md` using `templates/assessment.md` skeleton.

Verdict labels by overall score:

- ≥ 8.0 → READY
- ≥ threshold and < 8.0 → READY-WITH-FIXES
- < threshold → NOT-READY

### Terminal headline

`🧪 Tech Lead → assessment N.N/10 (<verdict>) — .brocode/<id>/assessment.md`

If type=comparison, additionally print:
`🏆 Tech Lead → winner: <spec-name> (overall N.N vs N.N)`

Stop.

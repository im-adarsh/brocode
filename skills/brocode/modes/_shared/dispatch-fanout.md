# Shared: Tech Lead Parallel Dispatch
<!-- Referenced by spec.md and investigate.md. -->

After Tech Lead's `threads/tech-lead-ready.md` written, TPM dispatches Tech Lead with phase-specific instruction file. Tech Lead internally writes instruction files for sub-agents and dispatches in parallel.

## Sub-agent instruction files (written by Tech Lead)
- `.brocode/<id>/instructions/backend-<phase>.md`
- `.brocode/<id>/instructions/frontend-<phase>.md`  (if web in scope)
- `.brocode/<id>/instructions/mobile-<phase>.md`    (if mobile in scope)
- `.brocode/<id>/instructions/sre-<phase>.md`
- `.brocode/<id>/instructions/qa-<phase>.md`

Each instruction file contains:
- Domain repo paths from `~/.brocode/repos.json`
- Knowledge base path: `~/.brocode/wiki/<repo-slug>/`
- Thread output path: `threads/<topic>.md` (descriptive names, never role-based)
- `superpowers:systematic-debugging` trigger: 2 hypotheses eliminated, intermittent, 3+ layers, contradictory symptoms
- SRE: produce `ops.md`
- QA: produce `test-cases.md`

**Scoping rules per sub-agent (token discipline):**
- Backend / Frontend / Mobile: only their domain section of `brief.md` + their domain threads + their wiki repo dirs
- SRE: blast-radius section of `brief.md` + technical-requirements section of `product-spec.md` (spec mode only) + relevant domain threads. Do NOT include `implementation-options.md` if not yet written.
- QA: acceptance-criteria sections of `brief.md` + `product-spec.md` (spec mode only) + relevant domain threads. Do NOT include `implementation-options.md` if not yet written.

## TPM logging (one entry per sub-agent — never batch)

DISPATCH events (one per sub-agent):
- `E-NNN · DISPATCH · Backend Engineer` — instruction file path
- `E-NNN · DISPATCH · Frontend Engineer` — instruction file path
- `E-NNN · DISPATCH · Mobile Engineer` — instruction file path
- `E-NNN · DISPATCH · SRE` — instruction file path
- `E-NNN · DISPATCH · QA` — instruction file path

THREAD-OPEN events (one per thread file created by any sub-agent).

ARTIFACT events (one per output, logged as each agent finishes — not batched):
- `E-NNN · ARTIFACT · Backend Engineer` — threads/<topic>.md, N findings
- `E-NNN · ARTIFACT · Frontend Engineer` — threads/<topic>.md, N findings
- `E-NNN · ARTIFACT · Mobile Engineer` — threads/<topic>.md, N findings
- `E-NNN · ARTIFACT · SRE` — ops.md v1
- `E-NNN · ARTIFACT · QA` — test-cases.md v1

After all sub-agents complete, Tech Lead synthesis:
- `D-NNN · DECISION · Tech Lead` — implementation option chosen (spec mode) OR root cause confirmed (investigate mode)
- `E-NNN · ARTIFACT · Tech Lead` — `implementation-options.md` v1 OR `investigation.md` v1

Then: `📦 TPM → compacting context before Engineering BR loop` and run `/compact`.

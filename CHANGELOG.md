# Changelog

All notable changes to brocode are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] — 2026-05-03

### Added
- **Config system** — `~/.brocode/config.json` with configurable BR round limits and per-role model overrides
- **First-run onboarding** — interactive repo collection when `~/.brocode/repos.json` missing
- **Skill packaging** — `skills/brocode/SKILL.md` + 5 on-demand mode files replace monolithic `commands/brocode.md`; ~75% token reduction per run
- **Safe updater** — `commands/update.md` rewritten with stash / backup / force / abort flow before `git reset --hard`
- **CI validation** — `scripts/validate.sh` checks plugin.json validity, agent headers, dangerous commands, broken refs; GitHub Actions runs on push + PR
- **Hooks** — `hooks/pre-tool-use-guard.sh` blocks unguarded `git reset --hard`; `hooks/post-write-validate.sh` warns on missing agent headers; both registered in plugin.json
- **Artifact model** — `## Handoff` block added to all 7 agent output formats; TPM validates presence before marking artifacts done
- **evidence.md** — Tech Lead writes structured evidence log after investigation; TPM writes implementation evidence after develop
- **decisions.md** — TPM extracts all D-NNN decision blocks into standalone file after spec runs
- **User Decision Points** — TPM protocol for invoking `AskUserQuestion` on true architectural forks

### Removed
- **Designer agent** — `agents/designer.md` deleted; PM now owns UX flows in `product-spec.md` section 15 (full E2E mermaid + per-persona tables + error/empty/loading states)
- `templates/ux.md` — no longer a separate artifact

### Changed
- `agents/pm.md` — added section 15 UX Flows to output format; PM owns all UX deliverables
- `agents/tpm.md` — removed Designer from org chart; added config pre-flight; added Handoff validation rule; added User Decision Points protocol
- `CLAUDE.md` — updated commands table, flow summary, context directory structure
- `plugin.json` — version bumped to 0.3.0; hooks array added

---

## [0.2.0] — 2026-04-29

### Added
- ADR export subcommand (`/brocode export-adrs`)
- Token optimization — context pruning for large repos
- Knowledge base wiki (`~/.brocode/wiki/`) persisted across runs

### Changed
- Tech Lead synthesis improved for multi-domain findings
- Engineering BR challenge format standardized

---

## [0.1.0] — 2026-04-27

### Added
- Initial release
- Investigate mode (bug → root cause → engineering-spec + tasks)
- Spec mode (feature → product-spec → engineering-spec + tasks)
- Develop mode (tasks → parallel domain worktrees → PRs)
- Review mode (PR URL → inline comments)
- Agent roster: TPM, PM, Designer, Tech Lead, Backend, Frontend, Mobile, SRE, QA, Product BR, Engineering BR
- `~/.brocode/repos.json` multi-repo config
- `~/.brocode/wiki/` knowledge base

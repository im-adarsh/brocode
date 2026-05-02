# Contributing to brocode

Thanks for your interest in contributing. brocode is a multi-agent SDLC plugin — contributions can be agent improvements, new modes, bug fixes, documentation, or templates.

## Quick start

```bash
git clone https://github.com/im-adarsh/brocode
cd brocode
bash scripts/validate.sh   # must pass before any PR
```

## What to contribute

| Area | What helps |
|------|-----------|
| Agent prompts (`agents/`) | Sharper instructions, better output formats, edge case handling |
| Mode files (`skills/brocode/modes/`) | Flow improvements, new subcommands |
| Templates (`templates/`) | Better artifact templates |
| Validation (`scripts/validate.sh`) | New checks |
| GitHub Pages (`docs/index.html`) | UI/UX improvements to the landing page |
| Bug reports | Clear reproduction steps via the bug report template |

## Ground rules

- **One concern per PR.** Don't bundle unrelated changes.
- **`scripts/validate.sh` must pass.** PRs that break validation are not merged.
- **Agent files need headers.** Every `agents/*.md` must have `# Role:` and `**Model:**` lines.
- **No `git reset --hard` without `# brocode-confirmed`.** The pre-tool-use hook enforces this.
- **Read before edit.** Always read a file before modifying it (mirrors the agent rule).

## Agent file conventions

All agent files follow this structure:

```markdown
# Role: [Role Name]
**Model: claude-[model]** — [reason for model choice]

## [Sections...]
```

When adding a new agent:
1. Create `agents/<role>.md` with `# Role:` and `**Model:**` headers
2. Add to the agent roster table in `CLAUDE.md`
3. Add dispatch step to the relevant mode file in `skills/brocode/modes/`
4. Run `bash scripts/validate.sh`

## PR process

1. Fork the repo and create a branch: `git checkout -b feat/your-change`
2. Make changes, run `bash scripts/validate.sh`
3. Open a PR against `main` with a clear title and description
4. A maintainer will review within a few days

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:
- brocode version (from `.claude-plugin/plugin.json`)
- What you ran (`/brocode <input>`)
- What happened vs what you expected
- Relevant output from `.brocode/<id>/tpm-logs.md` if available

## Suggesting features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

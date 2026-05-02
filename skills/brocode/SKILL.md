---
description: "Multi-agent SDLC. One command. Full engineering org."
---
{{args}}

## Quick Reference
**Modes:** INVESTIGATE · SPEC · DEVELOP · REVIEW · subcommands
**Step 0 subcommands:** revise · repos · develop · review · export-adrs
**Investigate flow:** Pre-flight → Tech Lead → parallel team → Engineering BR → spec → ADRs
**Spec flow:** Pre-flight → PM → Product BR gate → Tech Lead → parallel team → Engineering BR → spec → ADRs
**Read in full when:** First run in a session or ambiguous input

## Step 0: Route to mode file

Detect mode from input, then read ONLY the relevant mode file:

| Input matches | Load |
|--------------|------|
| bug / crash / error / broken / flaky / incident / "why is X" / "stopped working" | `skills/brocode/modes/investigate.md` |
| feature / spec / build / design / add / new / PRD / "build X" / "add Y" | `skills/brocode/modes/spec.md` |
| develop / implement / "build it" / "code it" / "start development" | `skills/brocode/modes/develop.md` |
| review / PR URL / MR URL / "review this" / "code review" | `skills/brocode/modes/review.md` |
| repos / setup / revise / challenge / export-adrs / "add constraint" | `skills/brocode/modes/subcommands.md` |

Do NOT read other mode files. Do NOT read `commands/brocode.md`.
After reading the mode file, follow its instructions exactly.

If input is ambiguous between INVESTIGATE and SPEC, ask one question: "Is this a bug to investigate or a feature to spec?"

# Shared: BR Loop
<!-- Referenced by spec.md (Product BR + Eng BR) and investigate.md (Eng BR). -->

For each artifact, BR producer pair runs this loop. Caller specifies:
- `<BR>` — Product BR or Engineering BR
- `<producer>` — PM (Product BR) or Tech Lead (Eng BR)
- `<artifact>` — file under review
- `<rounds>` — `product_rounds` or `engineering_rounds` from config
- `<gate-dir>` — `br/product/` or `br/engineering/`

```
round = 1
loop:
  TPM writes: .brocode/<id>/instructions/<br-slug>-round<round>-<artifact>.md
  Print: 📋 TPM → instruction written
  TPM logs: E-NNN · DISPATCH · <BR> (round <round>, artifact: <artifact>)

  Dispatch <BR> sub-agent (fresh context):
    - reads <artifact> + all prior challenge files for this artifact
    - reads agents/<br>.md + its instruction file
    - either: writes <gate-dir><N>-<artifact>-challenge-round<round>.md
    - or:     writes <gate-dir><N>-<artifact>-approved.md → BREAK loop

  if challenged:
    print: ⚠️ <BR> → [N challenges on <artifact>] (round <round>)
    TPM logs: E-NNN · CHALLENGE · <BR> (round <round>) — list each challenge title
    dispatch <producer> sub-agent (fresh context):
      - reads challenge file + current artifact + their agent file + original instruction
      - revises artifact (appends ## Changes from <BR> Challenge round <round>)
      - notifies other agents via thread if change affects their artifact
    TPM logs: D-NNN per producer choice during revision
    TPM logs: E-NNN · REVISE · <producer>
    print: 🟢 <producer> → revised <artifact> v<round+1>
    round += 1

  if approved:
    TPM logs: E-NNN · APPROVE · <BR>

  if round > <rounds>:
    print: 🚫 <BR> → ESCALATE: unresolved after <rounds> rounds on <artifact>
    TPM logs: E-NNN · ESCALATE · TPM — full round history, unresolved gap, question for user
    surface exact unresolved challenge to user (use AskUserQuestion — see _shared/conversation-logging.md)
    wait for user answer before continuing
    break
```

**Thread Summarization fires after every CHALLENGE entry** — see `agents/tpm.md` § Coordination Protocol.

**/compact fires after each artifact approval** — see `agents/tpm.md` § Compaction Protocol.

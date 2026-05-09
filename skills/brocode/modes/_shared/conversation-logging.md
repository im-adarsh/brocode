# Shared: Conversation Logging
<!-- Referenced by tpm.md, all mode files. Captures every user/Claude exchange. -->

## Purpose

`.brocode/<id>/conversation.md` is a verbatim, redacted, append-only log of every user-facing turn during a brocode run. It captures:
- Free-text user messages (what user typed)
- AskUserQuestion calls — question, all options, user's answer (label + free-text notes)
- TPM-to-user surfaces (escalations, blockers, decision points)
- Agent-to-user surfaces (Tech Lead clarification prompts, PM input-blocked prompts)
- Final Claude responses surfaced back to user

It is distinct from `tpm-logs.md` (orchestration journal) and `decisions.md` (D-NNN extract). When user input becomes a decision, write BOTH a D-NNN block in `tpm-logs.md` AND the conversation block here.

## File location

`.brocode/<id>/conversation.md` — created by TPM at Pre-flight (right after `brief.md` written).

## File header

```markdown
# Conversation Log
**Run ID:** [id]
**Started:** YYYY-MM-DD HH:MM
**Redaction policy:** secrets/keys/tokens/passwords replaced with `[REDACTED:<kind>]`

---
```

## Entry types

### USER — free-text user message

```markdown
### [C-NNN] HH:MM · USER
> [verbatim user text, line-wrapped if long]

**Routed to:** TPM | PM | Tech Lead | <other>
**Triggered:** <run start | revision request | answer to TPM blocker | mid-run interjection>
```

### ASK — AskUserQuestion call

```markdown
### [C-NNN] HH:MM · ASK · <agent>
**Question:** <question text>
**Header:** <header chip>
**Options:**
- A. <label> — <description>
- B. <label> — <description>
- C. <label> — <description>

**User chose:** <label of chosen option>
**User notes:** <free-text the user added — or "—">
**Linked decision:** D-NNN (if this answer became a decision, otherwise "—")
```

### SURFACE — agent → user (no answer expected, e.g. status / warning)

```markdown
### [C-NNN] HH:MM · SURFACE · <agent>
> [verbatim message printed to user]

**Reason:** <gate open | warning | blocker announcement | progress milestone>
```

### ESCALATE — agent → user, blocking

```markdown
### [C-NNN] HH:MM · ESCALATE · <agent>
**Context:** <what triggered escalation — BR round exceeded / contradictory findings / scope ambiguity>
**Question for user:** <exact one-sentence question>
**User answer:** <verbatim — or "PENDING" until reply received>
**Linked event:** E-NNN in tpm-logs.md
**Linked decision:** D-NNN (if user answer became a decision)
```

### CLAUDE — final assistant text returned to user

```markdown
### [C-NNN] HH:MM · CLAUDE · <agent>
> [verbatim assistant text — the final user-facing summary, not internal reasoning]
```

Only log CLAUDE entries for messages the user actually sees. Skip internal tool-call narration.

## Numbering

`C-NNN` global, monotonic. Independent of E-NNN / D-NNN.

## Redaction rules — apply BEFORE writing

Match these patterns and replace the matched value with the marker:

| Pattern | Replace with |
|---------|--------------|
| `sk-[A-Za-z0-9]{20,}` | `[REDACTED:api-key]` |
| `ghp_[A-Za-z0-9]{36}` | `[REDACTED:github-token]` |
| `xox[bpoa]-[A-Za-z0-9-]{10,}` | `[REDACTED:slack-token]` |
| `AKIA[0-9A-Z]{16}` | `[REDACTED:aws-access-key]` |
| `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` | `[REDACTED:jwt]` |
| `-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----` | `[REDACTED:private-key]` |
| `(password\|passwd\|pwd)\s*[:=]\s*\S+` (case-insensitive) | `password=[REDACTED:password]` |
| `(secret\|api[_-]?key\|access[_-]?token\|bearer)\s*[:=]\s*\S+` (case-insensitive) | `<key>=[REDACTED:secret]` |
| `Authorization:\s*Bearer\s+\S+` | `Authorization: Bearer [REDACTED:bearer]` |
| URLs containing `?token=` / `?key=` / `?api_key=` | strip query string, keep host+path, append `?[REDACTED:url-secret]` |
| Email addresses | preserve domain only: `<user>@example.com` → `[REDACTED:email]@example.com` (set `redact_emails=false` in config to keep) |
| 16-digit numbers matching `\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b` | `[REDACTED:card]` |

**Apply order:** specific patterns first (sk-, ghp_, AKIA, JWT, private-key) → generic key/secret patterns → URL/email/card.

**Never redact:**
- File paths
- Function/class names
- Code identifiers
- Run IDs (`spec-YYYYMMDD-*`, `inv-YYYYMMDD-*`)

If unsure whether a token is a secret, redact. False positives are cheaper than leaks.

## When to write a conversation entry

| Event | Entry type | Who writes |
|-------|-----------|-----------|
| User sends a message | USER | TPM (next dispatch reads + appends) |
| AskUserQuestion called by any agent | ASK | The agent making the call |
| TPM/agent prints status to user (gate open, ESCALATE) | SURFACE | The printing agent |
| BR round exceeded, agent surfaces unresolved gap | ESCALATE | TPM |
| Sub-agent prompts user for input (Tech Lead clarification, PM input-blocked) | ASK or ESCALATE | Sub-agent |
| Final Claude response back to user (end of run, mid-run summary) | CLAUDE | Whichever agent surfaces it |

Sub-agents do NOT have direct write access to `conversation.md` during their own context — they emit a `## Conversation Entry` block in their DONE report (see `agents/<role>.md` Handoff Block). TPM transcribes into `conversation.md` after dispatch returns.

## Cross-references

- USER answer that resolves a blocker → also write E-NNN UNBLOCK + D-NNN in `tpm-logs.md`. Set `Linked decision: D-NNN` here.
- ASK that becomes a decision → also write D-NNN. Set `Linked decision: D-NNN` here.

## Sub-agent Handoff Block addition

Add to every sub-agent's DONE report (after `## Handoff` section):

```markdown
## Conversation Entry (if any user interaction occurred this dispatch)
- Entry type: <USER | ASK | SURFACE | ESCALATE | CLAUDE>
- Verbatim text: <message or question>
- Options (if ASK): A. <label>, B. <label>, ...
- User answer: <verbatim>
- User notes: <free text — or "—">
- Redaction applied: <yes/no — list patterns matched>
```

If no user interaction occurred, omit this block.

TPM appends the block to `conversation.md` as a properly-typed entry on receiving the DONE report.

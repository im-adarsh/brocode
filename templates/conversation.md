# Template: conversation.md
<!-- Created by TPM at Pre-flight per _shared/conversation-logging.md. -->
<!-- Authoritative format and redaction rules: skills/brocode/modes/_shared/conversation-logging.md -->

```markdown
# Conversation Log
**Run ID:** [id]
**Started:** YYYY-MM-DD HH:MM
**Redaction policy:** secrets/keys/tokens/passwords replaced with `[REDACTED:<kind>]`

---

### [C-001] HH:MM · USER
> [verbatim user prompt]

**Routed to:** TPM
**Triggered:** run start

---

### [C-002] HH:MM · ASK · TPM
**Question:** <question text>
**Header:** <header chip>
**Options:**
- A. <label> — <description>
- B. <label> — <description>
- C. <label> — <description>

**User chose:** <label>
**User notes:** <free-text or "—">
**Linked decision:** D-NNN (or "—")

---

### [C-003] HH:MM · SURFACE · Product BR
> [verbatim message printed to user]

**Reason:** gate open

---

### [C-NNN] HH:MM · ESCALATE · TPM
**Context:** <BR rounds exceeded / contradictory findings / scope ambiguity>
**Question for user:** <one sentence>
**User answer:** <verbatim — or "PENDING">
**Linked event:** E-NNN
**Linked decision:** D-NNN (if any)

---

### [C-NNN] HH:MM · CLAUDE · TPM
> [verbatim assistant text returned to user — final summaries only]
```

## Sub-agent DONE-report Conversation Entry block

Sub-agents append to their DONE report when user interaction occurred during their dispatch. TPM transcribes these into `conversation.md` entries.

```markdown
## Conversation Entry (if any user interaction occurred this dispatch)
- Entry type: <USER | ASK | SURFACE | ESCALATE | CLAUDE>
- Verbatim text: <message or question>
- Options (if ASK): A. <label>, B. <label>, ...
- User answer: <verbatim>
- User notes: <free text — or "—">
- Redaction applied: <yes/no — list patterns matched>
```

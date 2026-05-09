# Browser Visual Companion: Callback Detection
<!-- Status: INTEGRATION POINT MARKED — NOT YET IMPLEMENTED -->
<!-- Moved out of agents/tpm.md to keep TPM agent file lean. Re-fold only when implementing. -->

After key artifacts are written and approved, TPM emits a browser-ready signal and polls for visual workflow decisions from the browser companion UI.

## Integration points (priority order)

### 1. After product-spec.md approved (Product BR gate open)
- Context: Product requirements finalized, UX flows complete
- Signal: Print `[ready] Browser visual companion at http://localhost:3847 — review UX flows`
- Poll: `.brocode/<id>/browser-choice.json` for up to 30 minutes
- Expected choice: `{ "choice": "proceed", "artifact": "product-spec.md", "feedback": "..." }`
- Action on choice:
  - Read choice and feedback
  - Log `D-NNN · DECISION · Browser` in tpm-logs.md (type: "visual feedback on UX flows")
  - Append `C-NNN · ASK · Browser` to conversation.md
  - Delete `browser-choice.json`
  - Continue to engineering track (Tech Lead dispatch)

### 2. After engineering-spec.md + tasks.md approved (before develop mode)
- Context: Full spec finalized, implementation plan ready
- Signal: Print `[ready] Browser visual companion at http://localhost:3847 — review architecture diagram`
- Poll: `.brocode/<id>/browser-choice.json` for up to 30 minutes
- Expected choice: `{ "choice": "proceed_to_develop" | "request_revision", "artifact": "engineering-spec.md", "feedback": "..." }`
- Action on choice:
  - If `proceed_to_develop`: delete file, transition to develop mode
  - If `request_revision`: log as new BR challenge, re-dispatch Tech Lead with feedback

### 3. After each domain PR created (develop mode)
- Context: Implementation complete for domain, PR link available
- Signal: Print `[ready] Browser visual companion at http://localhost:3847 — review <domain> implementation`
- Poll: `.brocode/<id>/browser-choice-<domain>.json` for up to 15 minutes
- Expected choice: `{ "choice": "approve" | "request_changes", "pr_url": "...", "feedback": "..." }`
- Action on choice:
  - Log visual approval in tpm-logs.md + conversation.md
  - Continue to next domain or finalize if all domains approved

## Activation gating (NEW)

Polling must be opt-in to avoid blocking 30 min while holding TPM context. Read `~/.brocode/config.json`:

```json
{
  "browser_companion": {
    "enabled": false,
    "url": "http://localhost:3847",
    "poll_timeout_minutes_artifact": 30,
    "poll_timeout_minutes_pr": 15,
    "poll_interval_seconds": 2
  }
}
```

If `browser_companion.enabled` is `false` (default): print signal but skip polling, do not block.

## Implementation pattern (pseudo-code)

```python
function poll_browser_choice(callback_file, timeout_minutes=30, poll_interval_seconds=2):
  start_time = now()
  deadline = start_time + (timeout_minutes * 60)

  while now() < deadline:
    if file_exists(callback_file):
      choice = json_read(callback_file)
      log_decision_entry(choice)
      append_conversation_entry(choice)
      delete(callback_file)
      return choice
    sleep(poll_interval_seconds)

  timeout_error = f"Browser choice not received after {timeout_minutes} minutes"
  log_escalation(timeout_error)
  surface_to_user(timeout_error)
  return None
```

## Logging in tpm-logs.md

When browser choice is received:

```markdown
### [D-NNN] HH:MM · DECISION · Browser
**[Visual feedback on <artifact>]**

| Option | Description | Why considered / rejected |
|--------|-------------|--------------------------|
| A | User choice: <choice> | ✓ Chosen by browser visual companion |
| B | [alternative] | Not chosen |

**Chose:** A — User visual feedback
**Rationale:** [feedback text from browser-choice.json]
**Downstream impact:** [artifact affected, next step]
**Revisit if:** [conditions for further revision]
```

## Logging in conversation.md

```markdown
### [C-NNN] HH:MM · ASK · Browser
**Question:** Visual review of <artifact>
**Options:** proceed | request_revision
**User chose:** <choice>
**User notes:** <feedback>
**Linked decision:** D-NNN
```

## Files to modify when implementation begins

- `skills/brocode/modes/spec.md` — add callback after Product BR gate + after engineering-spec approved
- `skills/brocode/modes/develop.md` — add callback after each domain PR created
- `agents/tpm.md` — add "On BROWSER-CHOICE" coordination protocol entry
- `templates/browser-choice.schema.json` (new) — JSON schema for callback file format
- `.brocode/<id>/browser-ready.log` (new) — track all browser-ready signals during run (optional, for debugging)

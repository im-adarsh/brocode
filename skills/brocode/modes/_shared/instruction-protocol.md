# Shared: Instruction File Protocol
<!-- Referenced by mode files. Do not duplicate inline. -->

Before dispatching ANY sub-agent, TPM writes `.brocode/<id>/instructions/<role>-<phase>.md`:

```
# Instruction: <role> — <phase>
Run ID: <id>
Your agent file: agents/<agent-file>.md
What to do: <specific task, concrete>
Files to read: <explicit list of paths>
File to write: <exact output path>
Threads: <thread files to create/append, if applicable>
Thread reading rule: For any thread file > 50 lines, read the `## Summary` section
  only unless you are doing a revision or the Summary says "open question: [your domain]".
  Full thread content preserved below summary for audit.
Constraints: <hard rules>
Model override: <value>     # omit if no override configured
```

Print immediately after writing:
`📋 TPM → instruction written: instructions/<role>-<phase>.md`

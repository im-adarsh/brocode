# /session — Current session summary

Read the brocode session state file at the path returned by:

```
node -e "const os=require('os'),path=require('path'); console.log(path.join(os.tmpdir(),'brocode-session.json'))"
```

Also check for a previous session summary at:
```
node -e "const os=require('os'),path=require('path'); console.log(path.join(os.tmpdir(),'brocode-last-session.json'))"
```

Then report a concise session summary covering:

1. **Duration** — how long this session has been running (startTime → now)
2. **Files touched** — list every file in `files[]`, grouped by directory
3. **Tool calls** — total count from `toolCalls`
4. **Session cost** — available from the status bar (`data.cost.total_cost_usd`); mention it if you know it
5. **Git checkpoint** — if `checkpointSha` is present, mention the SHA so the developer knows their rollback point: `git checkout <sha>` or `git diff <sha>` to review all changes since the session started

Format the output as a tight markdown summary — no unnecessary prose.
If neither session file exists, say so and explain that brocode tracks sessions automatically when launched via `brocode` (not `claude`).

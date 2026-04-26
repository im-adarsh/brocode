---
name: brocode-setup-repos
description: Use when user wants to register local repo paths for backend, mobile, or web — saves to .brocode-repos.json for engineer agents to read
---

# Setup Repos

Register local repository paths so engineer agents know where to read real code.

## When to Use

- User runs `/brocode repos` or `/brocode setup`
- User says "my backend is at X", "register repo", "set repo path"
- First time running `/brocode` and `.brocode-repos.json` does not exist

## What to Do

### 1. Check Existing Config

Read `.brocode-repos.json` in the current working directory if it exists.

```json
{
  "backend": "/path/to/backend",
  "web": "/path/to/web-frontend",
  "mobile": "/path/to/mobile-app",
  "other": []
}
```

### 2. Ask User

If paths not provided in command args, ask:

```
Which repos should engineer agents read from?

  Backend repo path  : (current: /path or "not set")
  Web/Frontend path  : (current: /path or "not set")
  Mobile repo path   : (current: /path or "not set")
  Other repos        : (optional, comma-separated paths)

Press Enter to keep current value. Type path to update. Type "clear" to remove.
```

### 3. Validate Paths

For each provided path:
- Run `ls <path>` to confirm directory exists
- If not found: warn user, ask to confirm or skip

### 4. Write Config

Write `.brocode-repos.json` to current working directory:

```json
{
  "backend": "/absolute/path/to/backend",
  "web": "/absolute/path/to/web",
  "mobile": "/absolute/path/to/mobile",
  "other": ["/path/to/shared-lib"],
  "updated_at": "YYYY-MM-DD"
}
```

### 5. Confirm

Print summary:

```
Repos saved to .brocode-repos.json

  Backend  → /path/to/backend
  Web      → /path/to/web
  Mobile   → /path/to/mobile

Engineer agents will read these paths during investigations and specs.
Run /brocode repos anytime to update.
```

## How Engineer Agents Use This

At start of any spec or investigation, orchestrator:
1. Reads `.brocode-repos.json` if present
2. Passes relevant paths in context:
   - `swe-backend.md` gets `backend` path
   - `swe-frontend.md` gets `web` path
   - `swe-mobile.md` gets `mobile` path
   - All get `other` paths
3. Agents run `find <path> -name "*.ts" | head -20` or `grep -r "pattern" <path>` etc. to read real code

## Notes

- `.brocode-repos.json` should be git-ignored (paths are machine-local)
- If path not set for a domain, that engineer agent skips code reading and notes it in their output
- "Other" repos useful for shared libraries, design systems, infra configs

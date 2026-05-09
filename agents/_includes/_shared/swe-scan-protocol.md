# SWE Shared Scan Protocol
<!-- Read by Backend / Frontend / Mobile Engineers at Step 1 (knowledge base scan + broad read). -->
<!-- Domain placeholder <DOMAIN> = backend | frontend | mobile. -->

## Step 0.5: Verify repos registered

Read `~/.brocode/repos.json`. Check if your domain (`<DOMAIN>`) has registered repos.

If your domain has NO entries:
- Print: `⚠️ <Role> → no repos registered for domain '<DOMAIN>'. Run /brocode:brocode repos to register. Cannot analyse without repo access.`
- Write warning to your thread file and STOP — do not proceed.

If repos registered but path does not exist on disk (`ls <path>` fails):
- Print: `⚠️ <Role> → repo path <path> not found on disk. Verify path and re-run /brocode:brocode repos.`
- STOP.

Only proceed if at least one repo path exists and is readable.

## Step 1a: Freshness check

Read `~/.brocode/wiki/log.md`. Find your repo slug and last scan date.

Run:
```bash
git -C <repo-path> log --since="<last-scan-date>" --name-only --format="" | sort -u
```

- If no files changed since last scan AND scan < 7 days ago → read cached wiki pages, skip to Step 1c
- If files changed OR scan > 7 days ago → run full scan (Step 1b), then Step 1c

## Step 1b: Full scan (run only if freshness check requires)

For each repo in `~/.brocode/repos.json` for your domain:
```bash
ls <repo-path>                                        # detect monorepo vs single-service
cat <repo-path>/CLAUDE.md 2>/dev/null                 # conventions, patterns, decisions
cat <repo-path>/AGENTS.md 2>/dev/null                 # agent-specific conventions
cat <repo-path>/package.json 2>/dev/null              # or go.mod / pubspec.yaml / Gemfile / pom.xml
ls <repo-path>/.github/workflows/ 2>/dev/null         # CI config
ls <repo-path>/packages/ <repo-path>/apps/ <repo-path>/services/ 2>/dev/null
```

Re-read any files that changed since last scan.

Write to `~/.brocode/wiki/<repo-slug>/` (create dir if needed):
- `overview.md` — repo pattern, stack, structure summary, CI
- `patterns.md` — directory layout, service boundaries, naming
- `conventions.md` — extracted from CLAUDE.md + observed patterns
- `dependencies.md` — key deps, versions, external services, APIs consumed
- `test-strategy.md` — test runner, coverage, file locations, patterns

Update `~/.brocode/wiki/index.md`:
```markdown
## <repo-slug>
Path: <repo-path>
Domain: <DOMAIN>
Pattern: <monorepo|single-service|polyrepo>
Stack: <comma-separated>
Last scanned: YYYY-MM-DD
Wiki: ~/.brocode/wiki/<repo-slug>/
```

Append to `~/.brocode/wiki/log.md`:
```
<repo-slug>  scanned  YYYY-MM-DD HH:MM  by <Role>
```

## Step 1c: Broad read (always — before narrowing to bug/feature)

Read the codebase broadly to understand the system before narrowing to the specific problem. This is how a real engineer approaches an unfamiliar codebase.

```bash
# Entry points
find <repo-path> -maxdepth 3 -name "main.*" -o -name "app.*" -o -name "index.*" -o -name "server.*" 2>/dev/null | head -10
ls <repo-path>/src/ <repo-path>/lib/ <repo-path>/cmd/ 2>/dev/null

# Test structure
find <repo-path> -maxdepth 3 -type d \( -name "test*" -o -name "__tests__" -o -name "spec" \) 2>/dev/null | head -10

# Key boundaries (domain-specific — backend example)
ls <repo-path>/src/routes/ <repo-path>/src/handlers/ <repo-path>/src/services/ <repo-path>/src/models/ 2>/dev/null
```

Read:
1. 2–3 entry-point files to understand request/render lifecycle
2. 1–2 test files to understand test patterns
3. Key config/schema files (migrations, ORM models, GraphQL schema, route config, navigation)
4. Any file in the area of the bug/feature (from instruction file) to orient before deep-dive

Then narrow to the specific bug/feature in your instruction file.

## Step 2: superpowers:systematic-debugging

If investigation stalls — 2 hypotheses eliminated, intermittent bug, 3+ layers, contradictory symptoms — invoke `superpowers:systematic-debugging` before continuing.

## Step 3: Write findings to threads

Write to `.brocode/<id>/threads/<topic>.md`. One file per topic. Descriptive names like `threads/api-pagination-strategy.md` or `threads/checkout-race-condition.md` — never role-based names like `threads/backend.md`.

Format per entry:
```
[<Role> → All]: <finding or proposal>
[<Role> → <Other Role>]: <targeted question or response>
```

If user interaction occurs during your dispatch, append `## Conversation Entry` block to your DONE report per `skills/brocode/modes/_shared/conversation-logging.md` — TPM transcribes into `conversation.md`.

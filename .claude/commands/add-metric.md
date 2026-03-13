# /add-metric — Add a new segment to the brocode status bar

You are helping the developer add a new metric (data segment) to the brocode live
status bar.  Follow the steps below exactly — brocode's architecture is a strict
three-file pipeline and all three must be updated together.

---

## Step 0 — Gather requirements

If the user has not already described the new metric, ask:

1. **What data does it show?** (e.g. "number of open GitHub issues", "battery %",
   "current Node version")
2. **Where does the data come from?** (git, a shell command, a file, an HTTP API,
   the Claude Code stdin JSON, the session JSONL transcript)
3. **How should it be displayed?** (colour, icon, label — suggest a sensible default
   that matches the existing segments)
4. **How often does the data change?** (Should it be cached?  If so, how long?)

Do NOT proceed to code until you have clear answers to all four.

---

## Step 1 — Add the data function to `src/metrics.js`

brocode's data layer is **`src/metrics.js`**.  All data fetching lives here.

**Rules you must follow:**
- No external npm packages — only `child_process`, `fs`, `path`, `os`, `https`.
- Use `spawnSync` (not `execSync`) for shell commands.  Pass args as an **array**,
  never interpolate into a shell string (prevents command injection).
- If the metric requires an HTTP call, model it on `fetchMonthlyCost()`:
  - Cache the result in `/tmp/brocode-<metric-name>.json` with a TTL constant.
  - Cache object shape: `{ value: <data>, fetchedAt: <Date.now()> }`.
  - Return `null` silently when data is unavailable (missing key, network error, etc.).
- If the metric reads from the Claude Code stdin JSON, just document which field to
  use — no new function needed (the field is already passed through
  `brocode-status.js`).
- Export the new function at the bottom of the file inside `module.exports = { ... }`.

**Example skeleton:**
```js
// ─── <Metric name> ────────────────────────────────────────────────────────────
const <METRIC>_CACHE     = path.join(os.tmpdir(), 'brocode-<name>.json');
const <METRIC>_CACHE_TTL = <N> * 60 * 1000;

/**
 * <One-line description>.
 * <Source / auth requirements if any>.
 * @returns {Promise<<type> | null>}   or {<type> | null} if sync
 */
async function fetch<MetricName>() {
  try {
    const cache = JSON.parse(fs.readFileSync(<METRIC>_CACHE, 'utf8'));
    if (Date.now() - cache.fetchedAt < <METRIC>_CACHE_TTL) return cache.value;
  } catch { /* cache miss */ }

  // ... fetch logic ...

  try {
    // ...
    fs.writeFileSync(<METRIC>_CACHE, JSON.stringify({ value: result, fetchedAt: Date.now() }));
    return result;
  } catch {
    return null;
  }
}
```

---

## Step 2 — Wire it in `bin/brocode-status.js`

**`bin/brocode-status.js`** is the entry point Claude Code calls on every refresh.
It reads stdin JSON, calls all metric functions, then passes everything to the
render functions.

1. Add the new function to the `require('../src/metrics')` destructure at the top.
2. Call it after the existing metric calls (maintain the same order as the status bar
   left-to-right).
3. Pass the result as a new named property in the `shared` object.
4. If the metric is `async`, `await` it (the whole callback is already `async`).

**The stdin schema** (from Claude Code):
```
{
  cwd:             string,
  transcript_path: string,
  model:           { id: string, display_name: string },
  cost:            { total_cost_usd: number },
  context_window:  { used_percentage: number }
}
```

---

## Step 3 — Add the segment to `src/render.js`

**`src/render.js`** is the presentation layer.  All ANSI codes are accessed through
the `C` object — do not inline `\x1b[…` literals elsewhere.

**Colour guide** (match existing segments):
| Meaning | Colour |
|---|---|
| Git / branch | `C.green` |
| Model name | `C.magenta` |
| Active tool | `C.cyan` |
| Context % < 60% | `C.green`, 60–80% `C.yellow`, ≥ 80% `C.red` |
| Cost / money | `C.yellow` |
| Labels / units | `C.dim` |
| Warnings | `C.red` |

1. Add a new `if (newMetric != null)` block inside **both** `renderStatusLine` and
   `renderGitExpanded`, in the same position (keep the two functions in sync).
2. Follow the `parts.push(...)` pattern — the separator `SEP` is inserted
   automatically by `parts.join(SEP)`.
3. The function signature of both render functions must gain the new parameter in
   the destructured `opts` object.
4. Do **not** add new ANSI escape codes to `C` unless truly necessary — prefer
   composing existing ones.

**Example addition:**
```js
// ── <Metric name> ─────────────────────────────────────────────────────────────
if (newMetric != null) {
  parts.push(`${C.<color>}<icon> ${newMetric}${C.reset} ${C.dim}<unit>${C.reset}`);
}
```

---

## Step 4 — Verify the output

After all edits, run:

```bash
npm install -g .
echo '{"cwd":"'$(pwd)'","transcript_path":null,"model":{"id":"claude-sonnet-4-6"},"cost":{"total_cost_usd":0},"context_window":{"used_percentage":18}}' | brocode-status
```

Check that:
- The new segment appears in the correct position.
- The output is still a single `exit 0`.
- No extra whitespace or broken ANSI codes around the new segment.
- `clearEol` (`\x1b[0K`) appears at the end of every line.

---

## Step 5 — Update CLAUDE.md

Append a row to the status bar segment table in **`CLAUDE.md`**:

```
| `<icon> <label>` | <source description> | <any caveats> |
```

---

## Constraints (enforce throughout)

- brocode has **zero runtime npm dependencies**.  Never `require` a package that
  isn't in Node.js core.
- `brocode-status` **must exit 0** — any non-zero exit blanks Claude Code's status
  bar.  Wrap any new async logic so errors are caught and return `null` gracefully.
- Every line of output must end with `C.clearEol` (`\x1b[0K`) to prevent stale
  characters on screen refresh.
- Keep the segment order consistent between `renderStatusLine` and
  `renderGitExpanded`.

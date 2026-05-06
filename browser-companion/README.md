# brocode Browser Visual Companion

Interactive browser UI for PM/Tech Lead to visualize and choose solution options during brocode scoping gates.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open browser:
   ```
   http://localhost:3847
   ```

## How It Works

1. TPM writes artifact files to `.brocode/<run-id>/`:
   - `product-spec.md` (PM approval gate)
   - `implementation-options.md` (Tech Lead selection)
   - `engineering-spec.md` (final review)

2. File watcher detects changes, parses artifacts, broadcasts updates to browser via WebSocket

3. UI renders:
   - Product Spec view: sections + UX flow diagrams
   - Implementation Options view: approach cards with architecture + metrics
   - Engineering Spec view: full spec with diagrams

4. User clicks "Choose Option B" → callback file written to `.brocode/<run-id>/browser-choice.json`

5. TPM detects callback, logs decision, continues orchestration

## Architecture

- **server.js** — Express app + Chokidar file watcher + callback handler
- **parse-artifacts.js** — Markdown → JSON converter (sections, Mermaid diagrams)
- **ui/app.js** — AppShell component + WebSocket client
- **ui/*View.js** — Artifact-specific view components
- **ui/styles.css** — Responsive layout (Grid/Flexbox)

## Tech Stack

- Node.js 18+
- Express (HTTP + static files)
- Chokidar (file watching)
- WebSocket (live updates)
- Mermaid.js (diagram rendering)
- Vanilla JS + CSS Grid

## Configuration

Set `BROCODE_PATH` environment variable to specify which `.brocode/<id>/` directory to watch:

```bash
BROCODE_PATH=/path/to/.brocode/run-001 npm start
```

Default: current working directory.

## Debugging

- Browser console: logs WebSocket events, user interactions
- Terminal: logs file watch events, callback submissions

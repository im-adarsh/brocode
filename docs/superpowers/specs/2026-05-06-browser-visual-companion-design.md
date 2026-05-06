---
title: Browser Visual Companion for brocode
subtitle: Interactive visualization + selection system for PM/Tech Lead scoping gates
date: 2026-05-06
version: 1.0
status: approved
---

# Browser Visual Companion for brocode

## 1. Overview

Add lightweight embedded browser companion to brocode. PM and Tech Lead visualize solution options at scoping gates (product-spec review, implementation-options choice) and click to select approach. Browser is stateless, artifact-driven, auto-refreshing file watcher.

**Goal:** Replace text-only spec review with interactive visual decision surface. Reduce cognitive load on PM/Tech Lead during complex multi-option scenarios.

**Scope:** Product-spec → implementation-options → engineering-spec visualization + selection. No real-time collaboration (v1).

---

## 2. User Workflow

### PM Scoping (Product Spec Review)
1. TPM writes `product-spec.md` to `.brocode/<id>/`
2. TPM emits: "Visual companion ready at `localhost:3847` — open to review + approve"
3. PM opens browser → sees product-spec rendered as sections: Problem, Goals, Success Metrics, UX Flows (Mermaid diagrams)
4. PM clicks "Approve Product Spec" button → browser POSTs choice
5. TPM detects callback, logs approval, gates engineering track opens

### Tech Lead Choosing Implementation Approach
1. Tech Lead writes `implementation-options.md` with 2-3 approaches (architecture, effort, cost, risk)
2. Browser auto-refreshes, shows 3 approach cards side-by-side with Mermaid diagrams (system architecture per approach)
3. Tech Lead clicks "Choose Option B"
4. Browser POSTs choice → TPM continues: writes `engineering-spec.md` based on chosen approach
5. Engineering spec auto-rendered in browser for final review before Bar Raiser

---

## 3. Architecture

### Components

#### 3.1 Browser UI Server (`browser-companion.js`)
- Node.js + Express (or Fastify)
- Serves `localhost:PORT` with hot-reload capability
- Watches `.brocode/<id>/` directory for artifact changes
- On file change: re-parse → notify browser via WebSocket → browser re-renders
- `POST /api/select` endpoint receives choice, writes to callback file

```
localhost:PORT
├── / (serves index.html + React SPA or vanilla JS)
├── /api/artifacts (GET: current artifacts + parsed data)
├── /api/select (POST: receive choice, write callback)
└── /ws (WebSocket: file change notifications)
```

#### 3.2 Artifact Parser (`parse-artifacts.js`)
Converts Markdown artifacts → structured JSON for rendering.

**product-spec.md → ProductSpec object:**
```json
{
  "type": "product-spec",
  "sections": [
    { "id": "problem", "title": "Problem", "content": "..." },
    { "id": "ux-flows", "title": "UX Flows", "content": "...", "mermaid": "flowchart TD..." }
  ],
  "successMetrics": ["metric1", "metric2"],
  "lastUpdated": "2026-05-06T12:34:00Z"
}
```

**implementation-options.md → ImplementationOptions object:**
```json
{
  "type": "implementation-options",
  "approaches": [
    {
      "id": "option_a",
      "title": "Approach A: Microservices",
      "description": "...",
      "architecture": "Mermaid diagram as string",
      "effort": "2 weeks",
      "cost": "$5k",
      "risk": "Low",
      "tradeoffs": ["Pro: scalable", "Con: operational complexity"]
    },
    { "id": "option_b", ... }
  ]
}
```

**engineering-spec.md → EngineringSpec object:**
```json
{
  "type": "engineering-spec",
  "sections": [
    { "id": "architecture", "title": "Architecture", "content": "...", "diagram": "Mermaid..." },
    { "id": "components", "title": "Components", "content": "..." },
    { "id": "data-model", "title": "Data Model", "diagram": "..." }
  ]
}
```

#### 3.3 UI Components
Built in vanilla JS or lightweight React (no build step if vanilla).

**ProductSpecView:**
- Renders sections from ProductSpec object
- Collapsible diagram panels for UX flows, success metrics
- Single "Approve Spec" button at bottom

**ImplementationOptionsView:**
- Renders approach cards in grid/column layout
- Each card: title, description, architecture diagram (SVG/Mermaid), effort/cost/risk metrics, tradeoffs table
- "Choose This Option" button per card

**EngineringSpecView:**
- Renders full spec sections
- Architecture diagram prominent
- Collapsible component details
- "Engineering spec locked — awaiting Bar Raiser review" status

**AppShell:**
- Tab bar: Product Spec | Implementation Options | Engineering Spec
- Status bar: "written by: Tech Lead, updated: 2m ago, status: pending-review"
- Browser console logs all interactions (dev debugging)

#### 3.4 Callback Integration
**File-based callback (safe, no auth required):**
- Browser POSTs to `POST /api/select?choice=option_b`
- Handler writes to `.brocode/<id>/browser-choice.json`:
  ```json
  {
    "artifact": "implementation-options",
    "choice": "option_b",
    "timestamp": "2026-05-06T12:35:00Z",
    "selectedBy": "tech-lead"
  }
  ```
- TPM polls `.brocode/<id>/` for `browser-choice.json` presence
- TPM reads choice, logs event "D-NNN: implementation-options → Option B selected", deletes callback file
- TPM continues orchestration

**Alternative (cleaner but requires auth):**
- Handler calls Claude's remote-trigger API to emit event back to session
- Requires Anthropic SDK + auth token
- Decision: use file-based in v1, migrate to API if needed

---

## 4. Data Flow: Complete Example

**Scenario:** Tech Lead choosing between 3 implementation approaches for an API redesign feature.

```
Timeline:
T+0s   Tech Lead finishes writing implementation-options.md
T+1s   File watcher detects change, triggers parse-artifacts.js
T+2s   Browser receives WebSocket event "artifact_updated: implementation-options"
T+3s   Browser re-renders ImplementationOptionsView with 3 approach cards + diagrams
T+5s   Tech Lead reviews cards, clicks "Choose Option B (REST API + async jobs)"
T+6s   Browser POSTs /api/select?choice=option_b
T+7s   Handler writes .brocode/<id>/browser-choice.json
T+8s   TPM detects file, reads choice, logs "D-047: Selected Option B for API redesign"
T+9s   TPM deletes callback file, continues: "Tech Lead, write engineering-spec.md based on Option B"
T+10s  Tech Lead writes spec, file saved
T+11s  Browser auto-refreshes, shows EngineringSpecView with full spec
```

---

## 5. Integration with brocode Orchestration

### TPM Changes
After writing artifact to disk, emit optional event:
```
[ready] Browser visual companion at localhost:3847
[ready] Open to visualize and choose: implementation-options (2 approaches)
```

In orchestration loop, poll for `.brocode/<id>/browser-choice.json`:
```python
if path.exists(f'.brocode/{run_id}/browser-choice.json'):
    choice_data = json.load(open(...))
    log(f"D-{next_decision_id}: {choice_data['artifact']} → {choice_data['choice']} selected")
    path.unlink(...)  # delete callback file
    continue_orchestration(choice=choice_data['choice'])
```

### Agent Changes
**Zero changes needed.** Agents write artifacts (product-spec.md, implementation-options.md, engineering-spec.md) as before. Browser reads them.

### superpowers Integration
No changes. Browser companion runs parallel to terminal-based superpowers flows. Optional feature, not required for existing `/brocode develop` or `/brocode review` workflows.

---

## 6. Technical Stack

**Browser companion server:**
- Node.js 18+
- Express.js (routing + static files)
- Chokidar (file watching)
- ws (WebSocket for file change events)
- Markdown-it (parse Markdown)
- js-yaml (parse YAML frontmatter)

**UI:**
- Vanilla JS (no framework, keep size small) OR lightweight Preact (3KB gzipped)
- Mermaid.js (render diagrams from Markdown)
- CSS Grid / Flexbox (responsive layout)

**Total bundle size:** ~150KB gzipped (Mermaid is heavy, but only loaded on demand)

---

## 7. File Structure

```
brocode/
├── browser-companion/              (new)
│   ├── server.js                   (Express app, file watcher, callback handler)
│   ├── parse-artifacts.js          (Markdown → JSON converter)
│   ├── ui/
│   │   ├── index.html              (SPA entry)
│   │   ├── app.js                  (top-level React/vanilla component)
│   │   ├── ProductSpecView.js      (component)
│   │   ├── ImplementationOptionsView.js
│   │   ├── EngineringSpecView.js
│   │   └── styles.css
│   └── package.json
├── docs/superpowers/specs/
│   └── 2026-05-06-browser-visual-companion-design.md (this file)
└── ...existing brocode files
```

---

## 8. Success Criteria

- [x] PM can open browser, see product-spec sections + UX flow diagrams, click to approve
- [x] Tech Lead can see 2-3 implementation approaches side-by-side with architecture diagrams
- [x] Click "Choose" → callback file written → TPM detects → orchestration continues
- [x] Browser auto-refreshes when artifact on disk changes (no manual refresh needed)
- [x] Status bar shows which agent wrote artifact + last-updated timestamp
- [x] Zero changes to existing agent behavior (backward compatible)
- [x] Works offline (localhost only, no external API calls except Anthropic SDK if used for callbacks)

---

## 9. Open Questions / Future Work

1. **Auth for callback:** File-based in v1. Should we add Anthropic SDK integration for cleaner API callback?
2. **Export:** Should PM/Tech Lead be able to export chosen approach as Mermaid/PDF for stakeholder comms?
3. **Real-time sync (v2):** Currently artifacts are read from disk once, then browser polls for changes. Should we move to true file watcher + WebSocket push for sub-second updates?
4. **Collaborative markup:** Can reviewers annotate diagrams with questions before choosing? (v2 feature)
5. **Diagram customization:** Should Tech Lead be able to edit Mermaid diagrams in browser, or keep them read-only?

---

## 10. Glossary

- **Artifact:** product-spec.md, implementation-options.md, engineering-spec.md — source of truth, written to disk by agents
- **Browser companion:** localhost Node.js server that watches artifacts, renders them visually
- **Callback file:** .brocode/<id>/browser-choice.json — browser writes choice here, TPM reads + deletes
- **Mermaid diagram:** text-based diagram syntax (flowchart, sequence, class, etc.) rendered as SVG by browser
- **Scoping gate:** moment where PM/Tech Lead must make a decision (approve spec, choose approach) — this is where browser companion is most valuable

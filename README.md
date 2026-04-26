# brocode

Multi-agent SDLC plugin for Claude Code. One command. Full engineering org simulated in your terminal.

Paste a bug report, feature idea, PRD, doc link, or screenshot. Type `/brocode`. The right agents spin up, converse, challenge each other, and produce a final approved spec or investigation report — no manual orchestration needed.

---

## Install

```bash
# Add local marketplace
claude plugin marketplace add /path/to/brocode

# Install
claude plugin install sdlc@brocode-local --scope user
```

Restart Claude Code after install.

---

## Usage

```
/brocode <anything>
```

No flags. No mode selection. brocode reads context and routes automatically.

### Examples

```
/brocode  users are getting 500 errors on checkout after the deploy at 3pm
/brocode  I want to add SSO login with Google OAuth to our app
/brocode  [attach screenshot of Figma mockup]
/brocode  [paste Google Doc link with PRD]
/brocode  why does the payment webhook fail intermittently on retries?
```

### Register your repos

Engineer agents read real code. Tell them where to find it:

```
/brocode repos
```

Prompts for backend / web / mobile paths. Saves to `.brocode-repos.json` (gitignored). Run once per machine.

---

## How it works

brocode has two modes. It picks the right one automatically.

---

### Mode 1: Investigate — Bug / Incident / Oncall

Triggered by: bug reports, errors, crashes, test failures, production incidents.

```
┌─────────────────────────────────────────────────────────────────┐
│                      /brocode <bug>                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────────────────┐
              │         SWE sub-agents               │
              │   spawned in parallel, scope-based   │
              │                                      │
         ┌────▼─────┐  ┌──────────▼──┐  ┌──────────▼──┐
         │ Backend  │  │  Frontend   │  │   Mobile    │
         │ Engineer │  │  Engineer   │  │  Engineer   │
         │ (if bug  │  │  (if bug    │  │  (if bug    │
         │ is BE)   │  │   is FE)    │  │  is mobile) │
         └────┬─────┘  └──────┬──────┘  └──────┬──────┘
              │               │                 │
              └───────────────┼─────────────────┘
                              │ swe-debate.md
                              ▼
                       Tech Lead + SRE
                    (parallel, independent)
                              │
                              ▼
                        Staff SWE Agent
               - Validates root cause architecturally
               - Checks for systemic causes
                              │
                              ▼
              Engineering Bar Raiser (Principal Eng)
               - Challenges root cause claim
               - Challenges proposed fix
               - Adversarial loop (max 2 rounds)
                              │
                              ▼
                      08-final-spec.md
           (confirmed root cause + fix + test case)
```

**What you get:** Root cause confirmed with evidence, exact code fix, failing test that proves the bug, ops impact assessment, rollback plan.

---

### Mode 2: Spec — Feature / System Design

Triggered by: feature requests, design tasks, PRDs, doc/image input.

```
┌──────────────────────────────────────────────────────────────┐
│                  /brocode <feature or doc>                   │
└─────────────────────────────┬────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │    Input Ingestion  │
                    │  text / image /     │
                    │  Google Doc / wiki  │
                    └─────────┬──────────┘
                              │
               ───── PRODUCT TRACK ──────────────────────────
                              │
              ┌───────────────┴──────────────┐
              ▼                              ▼
          PM Agent                    Designer Agent
    - Write requirements         - Design API contracts
    - Define user personas       - Design all user flows
    - End user journey           - Error / empty / loading states
    - Ops/admin journey          - Ops + support interfaces
    - Support journey            - Data models
    - Competitor references       ◄──────────────────────
                                   PM ↔ Designer converse
              │                              │
              └──────────────┬───────────────┘
                             ▼
              Product Bar Raiser (Principal PM)
                - Challenges PM requirements
                - Challenges Designer artifacts
                - Web searches competitor references
                - Verifies all personas covered
                - Adversarial loop (max 2 rounds each)
                - GATE: engineering blocked until approved
                             │
               ──── ENGINEERING TRACK ──────────────────────
                             │
              ┌──────────────┴──────────────────────────────┐
              │    Tech Lead dispatches sub-agents in parallel  │
              │       based on scope of the feature          │
              │                                              │
         ┌────▼─────┐       ┌──────────▼──┐  ┌────────────▼──┐
         │ Backend  │       │  Frontend   │  │    Mobile     │
         │ Engineer │       │  Engineer   │  │   Engineer    │
         │          │       │             │  │               │
         └────┬─────┘       └──────┬──────┘  └──────┬────────┘
              └──────────────────┬─┘                │
                                 │  swe-debate.md   │
                                 └──────────┬───────┘
                                            │
                                       Tech Lead
                              - Synthesizes 3 impl options
                                            │
                              ┌─────────────▼────────────┐
                              │        Staff SWE          │
                              │  - Architecture review    │
                              │  - Joint recommendation   │
                              └─────────────┬────────────┘
                                            │
                              ┌─────────────┴────────────┐
                              ▼                           ▼
                         SRE Agent                  QA Agent
                    (parallel)                  (parallel)
                    - Ops plan                  - Test matrix
                    - Rollback                  - Real test code
                    - Blast radius              - Every AC covered
                              │                           │
                              └─────────────┬─────────────┘
                                            ▼
                              Engineering Bar Raiser
                              - Challenges all 4 artifacts
                              - Cross-artifact consistency
                              - Adversarial loop (max 2 rounds)
                                            │
                                            ▼
                                    08-final-spec.md
                               (approved, ready to implement)
```

**What you get:** Approved requirements, API contracts, 3 impl options with recommendation, architecture review, ops plan with rollback, full test matrix. All challenged and signed off by two bar raisers.

---

## Engineering sub-agents — parallel by design

Backend, Frontend, and Mobile engineers are sub-agents. The Tech Lead dispatches only the ones relevant to the task, runs them in parallel, and collects their debate before synthesizing.

```
Feature touches web + backend only:
  → Backend + Frontend spawned in parallel
  → Mobile skipped

Mobile-only bug:
  → Mobile spawned
  → Backend/Frontend skipped unless API is involved

Full-stack feature:
  → All three spawned in parallel
  → Three-way debate in swe-debate.md
```

Each sub-agent reads its own repo (registered via `/brocode repos`). They challenge each other — Backend on API contracts, Frontend on round-trip count, Mobile on payload size and offline behavior. The debate produces better options than any one alone.

---

## Terminal progress

TPM prints a live status line at every agent transition:

```
📋  TPM          →  kicked off spec-20260426-oauth, logging stages
🎯  PM           →  reading brief, building requirements
🎯  PM      ↔️  🎨  Designer    →  PM asked: "empty state for first-time users?"
🎨  Designer      →  writing API contracts and user flows
🔬  Product BR    →  challenging PM requirements (round 1)
⚠️  Product BR    →  found gap: ops interface missing — routing back to PM
✅  Product BR    →  requirements APPROVED — product gate OPEN
⚙️  Backend  ↔️  🖥️  Frontend   →  Backend challenged: "3 round-trips for one screen"
⚠️  Eng BR       →  challenged Tech Lead: "option 3 has N+1 query — explain mitigation"
✅  Eng BR       →  all artifacts APPROVED
📋  TPM          →  writing final spec
```

Prefixes: `⚠️` BR challenge · `✅` approved · `🚫` blocked waiting on you

---

## Agents

| Agent | Role | Produces |
|-------|------|---------|
| **TPM** | Coordinates all agents, owns run log, prints live progress | `00-tpm-log.md` |
| **PM** | Senior Product Manager | `01-requirements.md` — personas, journeys, ACs, competitor refs |
| **Designer** | Senior Designer (API + UX) | `02-design.md` — API contracts, all flows, ops/support interfaces |
| **Product Bar Raiser** | Principal PM / Head of Product | Challenges PM + Designer. Web searches competitors. Gates engineering. |
| **Tech Lead** | Owns engineering team, orchestrates sub-agent debate, synthesizes final output | `03-investigation.md` or `03-implementation-options.md` |
| → **Backend Engineer** *(sub-agent)* | APIs, DB, services, queues — reads real backend code | Debate in `swe-debate.md` |
| → **Frontend Engineer** *(sub-agent)* | Web UI, state, browser, SSR/CSR — reads real frontend code | Debate in `swe-debate.md` |
| → **Mobile Engineer** *(sub-agent)* | iOS, Android, RN, Flutter, offline — reads real mobile code | Debate in `swe-debate.md` |
| **Staff SWE** | Staff Software Engineer | `04-architecture.md` — system context, failure modes, joint recommendation |
| **SRE** | Site Reliability Engineer | `05-ops.md` — observability, rollback, blast radius, runbooks |
| **QA** | QA Engineer | `06-test-cases.md` — full test matrix with actual test code |
| **Engineering Bar Raiser** | Principal Engineer | Challenges all 4 eng artifacts. Writes `08-final-spec.md`. |

---

## Bar Raisers

Bar Raisers are adversarial reviewers. Their challenges are blockers, not suggestions.

**Product Bar Raiser** (Principal PM):
- Challenges requirements for missing personas, untestable ACs, unresolved assumptions
- Challenges design for missing error states, undefined API contracts, missing ops/support interfaces
- Uses web search when competitors are referenced — verifies claims against real behavior
- Hard gate: engineering track cannot start until both PM and Designer artifacts are approved

**Engineering Bar Raiser** (Principal Engineer):
- Challenges SWE options for vague tradeoffs, options inconsistent with design
- Challenges Staff SWE for concerns without codebase evidence
- Challenges SRE for theoretical rollback plans, missing observability
- Challenges QA for ACs without tests, TODOs instead of test code
- Cross-checks all four artifacts for consistency with each other
- Writes the final spec after all four approved

**Loop protocol:**
```
BR challenges → producer revises → BR re-reviews
Max 2 rounds per artifact. After 2: escalates to you with a specific question.
```

---

## Agent conversations

Agents aren't isolated — they talk to each other. All exchanges logged in thread files.

| Thread | Who talks |
|--------|-----------|
| `threads/product-conversation.md` | PM ↔ Designer |
| `threads/swe-debate.md` | Backend ↔ Frontend ↔ Mobile — cross-domain challenge loop |
| `threads/eng-conversation.md` | SWE team ↔ Staff SWE ↔ SRE ↔ QA |
| `threads/eng-product-conversation.md` | SWE/Staff SWE ↔ PM/Designer |

Engineers can ask PM "what does AC-3 mean in the context of a retry?" PM can ask Designer "does this error state need a recovery action?". All answers logged.

---

## Repo config

Engineer sub-agents read real code. Register your repos once:

```
/brocode repos
```

Prompts for paths, validates they exist, writes `.brocode-repos.json` (gitignored):

```json
{
  "backend": "/absolute/path/to/backend",
  "web": "/absolute/path/to/web",
  "mobile": "/absolute/path/to/mobile",
  "other": ["/path/to/shared-lib"]
}
```

Each engineer reads its own path:
- `swe-backend.md` → `backend`
- `swe-frontend.md` → `web`
- `swe-mobile.md` → `mobile`

If a path isn't set, that agent asks before proceeding. No silent failures.

---

## Context directory

Every `/brocode` run creates `.sdlc/<id>/`:

```
.sdlc/spec-20260426-oauth/
  00-tpm-log.md                  # TPM master log — live throughout
  00-brief.md                    # User input + clarified scope
  00-input-raw.md                # External doc/image content (if ingested)
  01-requirements.md             # PM output — versioned
  02-design.md                   # Designer output — versioned
  03-implementation-options.md   # SWE output (spec mode)
  03-investigation.md            # SWE output (investigate mode)
  04-architecture.md             # Staff SWE output — versioned
  05-ops.md                      # SRE output — versioned
  06-test-cases.md               # QA output — versioned
  threads/
    product-conversation.md      # PM ↔ Designer exchanges
    swe-debate.md                # Backend ↔ Frontend ↔ Mobile debate
    eng-conversation.md          # Engineering team exchanges
    eng-product-conversation.md  # Eng ↔ Product exchanges
  07-product-br-reviews/
    01-pm-challenge-round1.md
    01-pm-approved.md
    02-design-challenge-round1.md
    02-design-approved.md
    gate-approved.md             # Product track cleared
  07-eng-br-reviews/
    01-swe-challenge-round1.md
    01-swe-approved.md
    02-staff-swe-approved.md
    03-sre-challenge-round1.md
    03-sre-approved.md
    04-qa-approved.md
  08-final-spec.md               # Final approved output
```

`.sdlc/` is gitignored.

---

## Input formats

| Input | How brocode handles it |
|-------|----------------------|
| Plain text | Used directly by PM |
| Attached image / screenshot / mockup | PM and Designer analyze via vision |
| Google Doc URL | Fetched via Google Drive MCP (if connected) |
| Notion / Confluence URL | Ask user to paste — no MCP by default |
| Figma URL | Ask user to export PNG — no Figma MCP by default |

If a required MCP isn't connected, brocode tells you exactly what to install or what to paste. Never silently fails.

---

## Resume

If `.sdlc/` exists with prior work, `/brocode` resumes from last approved stage. Run `/brocode` with no args in a project that has prior investigations — it will list them and ask which to resume.

---

## File structure

```
brocode/
  .claude-plugin/
    plugin.json              # Plugin manifest
    marketplace.json         # Local marketplace definition
  agents/
    tpm.md                   # TPM — coordination + progress display
    pm.md
    designer.md
    product-bar-raiser.md
    tech-lead.md             # Tech Lead (engineering team owner)
    swe-backend.md           # Backend sub-agent
    swe-frontend.md          # Frontend sub-agent
    swe-mobile.md            # Mobile sub-agent
    staff-eng.md
    sre.md
    qa.md
    engineering-bar-raiser.md
  skills/
    using-sdlc/SKILL.md      # Orientation
    investigate/SKILL.md     # Investigate mode orchestration
    spec/SKILL.md            # Spec mode orchestration
    input-ingestion/SKILL.md # External input handling
    bar-raiser-loop/SKILL.md # Adversarial loop protocol
    setup-repos/SKILL.md     # Register local repo paths
  commands/
    brocode.toml             # /brocode slash command
  docs/
    index.html               # GitHub Pages site
  CLAUDE.md                  # Working instructions for agents
  README.md                  # This file
  .brocode-repos.json        # Machine-local repo paths (gitignored)
```

---

## Extending brocode

### Add a new agent role

1. Create `agents/<role>.md` following existing agent format
2. Add to the relevant skill dispatch sequence (`investigate/SKILL.md` or `spec/SKILL.md`)
3. Update `CLAUDE.md` roster table
4. Update `skills/using-sdlc/SKILL.md` flow diagram

### Modify Bar Raiser challenge standards

- Product BR: `agents/product-bar-raiser.md` → "Challenge Standards" section
- Engineering BR: `agents/engineering-bar-raiser.md` → "What You Look For" section

### Add a new input format

`skills/input-ingestion/SKILL.md` → add new input type detection and handling

---

## License

MIT

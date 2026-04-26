---
name: sdlc-input-ingestion
description: Use when user provides external input (Google Doc, image, Figma, wiki, URL) as source material for PM or Designer agents
---

# Input Ingestion

Handles converting external input into text context for agents.

## Input Type Detection

Scan user message for:
- **URL containing `docs.google.com`** → Google Docs
- **URL containing `drive.google.com`** → Google Drive file
- **URL containing `figma.com`** → Figma design
- **URL containing `notion.so`** → Notion page
- **URL containing `confluence`** → Confluence wiki
- **Image attachment** → Screenshot / mockup / diagram
- **Plain text** → Use directly, no ingestion needed

## Google Docs / Google Drive

Check if `mcp__claude_ai_Google_Drive__read_file_content` is available.

**If available:** Extract the file ID from the URL and call the MCP tool.

**If not available:**
```
INPUT BLOCKED: Google Drive MCP not connected.

To connect: In Claude Code settings → MCP Servers → Add Google Drive
Or paste the document content directly in chat.
```

## Google Drive — File Search

If user says "the doc about X" without a URL:
Use `mcp__claude_ai_Google_Drive__search_files` with the description as query.
Present results to user for confirmation before reading.

## Images / Screenshots / Mockups

If image is in context: pass directly to PM or Designer agent — they use vision to analyze.

If image is a URL (not attached):
```
INPUT BLOCKED: Image URL provided but not attached.
Please paste/drag the image directly into the chat, or describe its contents.
```

## Figma

No Figma MCP available by default.
```
INPUT BLOCKED: Figma MCP not installed.

Options:
1. Export frames as PNG and attach to chat
2. Share a Figma dev mode link (if text-accessible)
3. Describe the design in text — PM/Designer will work from description
```

## Notion / Confluence / Other Wiki

No MCP available by default.
```
INPUT BLOCKED: [Notion/Confluence] MCP not installed.

Options:
1. Export page as PDF or Markdown and paste content
2. Copy-paste the relevant sections into chat
```

## Output

After successful ingestion, write content to `.sdlc/<id>/00-input-raw.md`:

```markdown
# Raw Input

**Source:** [URL or "attached image" or "user text"]
**Ingested:** [timestamp]
**Method:** [MCP tool used / vision analysis / direct paste]

---

[Content]
```

Then hand off to PM agent with: "Input ingested. PM: read `00-input-raw.md` and produce `01-requirements.md`."

## Failure Handling

If ingestion fails:
1. State exactly what failed and why
2. Give user 2-3 specific options to unblock
3. Do NOT proceed with empty/partial input — bad input produces bad requirements

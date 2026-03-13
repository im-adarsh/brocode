#!/usr/bin/env node
'use strict';

/**
 * brocode-hook-tool — PostToolUse hook.
 *
 * Called by Claude Code after every tool use.
 * Increments the session tool call counter and records the file path
 * for Edit/Write/MultiEdit/NotebookEdit tool calls.
 *
 * Must always exit 0 — a non-zero exit would cause Claude Code to abort.
 *
 * Hook stdin schema (PostToolUse):
 * {
 *   hook_event_name: "PostToolUse",
 *   tool_name:       string,
 *   tool_input:      object,
 *   tool_output:     string,
 *   session_id:      string,
 *   transcript_path: string
 * }
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const SESSION_FILE = path.join(os.tmpdir(), 'brocode-session.json');

// Tools that operate on a file_path we want to track
const FILE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  try {
    const event    = JSON.parse(raw);
    const toolName = event?.tool_name ?? '';
    const filePath = event?.tool_input?.file_path
                  || event?.tool_input?.path
                  || null;

    let state = { files: [], toolCalls: 0, startTime: Date.now(), checkpointSha: null };
    try { state = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')); } catch {}

    state.toolCalls = (state.toolCalls || 0) + 1;

    if (FILE_TOOLS.has(toolName) && filePath && !state.files.includes(filePath)) {
      state.files.push(filePath);
    }

    fs.writeFileSync(SESSION_FILE, JSON.stringify(state));
  } catch { /* never fail */ }

  process.exit(0);
});

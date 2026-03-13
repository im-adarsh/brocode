#!/usr/bin/env node
'use strict';

/**
 * brocode-hook-stop — Stop hook.
 *
 * Called by Claude Code when the session ends.
 * Archives the current session state to brocode-last-session.json
 * so the /session slash command can display it after the fact.
 *
 * Must always exit 0.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const SESSION_FILE      = path.join(os.tmpdir(), 'brocode-session.json');
const LAST_SESSION_FILE = path.join(os.tmpdir(), 'brocode-last-session.json');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  try {
    const state = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    state.endTime = Date.now();
    fs.writeFileSync(LAST_SESSION_FILE, JSON.stringify(state));
    fs.unlinkSync(SESSION_FILE);
  } catch { /* never fail */ }

  process.exit(0);
});

#!/bin/bash
# PreToolUse hook — blocks git reset --hard outside the explicit update flow
# Reads tool input from stdin as JSON (Claude Code hook protocol)
# Exit 2 = block the tool call with message. Exit 0 = allow.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('command',''))" 2>/dev/null)

if echo "$COMMAND" | grep -q "git reset --hard"; then
  # Allow if the command has a brocode-confirmed bypass comment
  if echo "$COMMAND" | grep -q "# brocode-confirmed"; then
    exit 0
  fi
  echo "🛡️ brocode guard: git reset --hard blocked."
  echo "Use /brocode:update to update safely (handles stash / backup / confirm)."
  echo "To bypass: add comment '# brocode-confirmed' on the line before the command."
  exit 2
fi

exit 0

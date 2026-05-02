#!/bin/bash
# PostToolUse hook — warns when brocode agent/skill files are written with missing headers
# Reads tool result from stdin as JSON (Claude Code hook protocol)
# Exit 0 always (PostToolUse cannot block — warn only)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null)

# Only validate brocode plugin files
if ! echo "$FILE_PATH" | grep -qE "(agents/|skills/brocode/|commands/).*\.md$"; then
  exit 0
fi

ERRORS=0

# Agent files need Role + Model headers
if echo "$FILE_PATH" | grep -q "agents/"; then
  if ! grep -q "^# Role:" "$FILE_PATH" 2>/dev/null; then
    echo "⚠️ brocode validate: $FILE_PATH missing '# Role:' header"
    ERRORS=$((ERRORS+1))
  fi
  if ! grep -q "^\*\*Model:" "$FILE_PATH" 2>/dev/null; then
    echo "⚠️ brocode validate: $FILE_PATH missing '**Model:**' line"
    ERRORS=$((ERRORS+1))
  fi
fi

# Unguarded git reset --hard (outside update.md)
if ! echo "$FILE_PATH" | grep -q "update.md"; then
  if grep -q "git reset --hard" "$FILE_PATH" 2>/dev/null; then
    if ! grep -q "# brocode-confirmed" "$FILE_PATH" 2>/dev/null; then
      echo "⚠️ brocode validate: $FILE_PATH contains 'git reset --hard' without '# brocode-confirmed' guard"
    fi
  fi
fi

if [ $ERRORS -gt 0 ]; then
  echo "Run scripts/validate.sh to check all plugin files."
fi

exit 0  # PostToolUse cannot block — warn only

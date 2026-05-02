#!/bin/bash
set -e
ERRORS=0

# 1. plugin.json parseable
python3 -c "import json,sys; json.load(open('.claude-plugin/plugin.json'))" 2>/dev/null \
  || { echo "❌ plugin.json: invalid JSON"; ERRORS=$((ERRORS+1)); }

# 2. Required agent fields
for f in agents/*.md; do
  grep -q "^# Role:" "$f" \
    || { echo "❌ $f: missing '# Role:' header"; ERRORS=$((ERRORS+1)); }
  grep -q "^\*\*Model:" "$f" \
    || { echo "❌ $f: missing '**Model:**' line"; ERRORS=$((ERRORS+1)); }
done

# 3. Dangerous command scan (unguarded git reset --hard outside update.md)
for f in agents/*.md commands/*.md; do
  if grep -q "git reset --hard" "$f" && [ "$f" != "commands/update.md" ]; then
    echo "⚠️  $f: contains 'git reset --hard' — ensure guard exists"
    ERRORS=$((ERRORS+1))
  fi
done

# 4. Broken internal agent references
grep -rh "agents/[a-z-]*\.md" agents/ commands/ CLAUDE.md 2>/dev/null \
  | grep -oE "agents/[a-z-]+\.md" | sort -u \
  | while read ref; do
    [ -f "$ref" ] || { echo "❌ broken reference: $ref"; ERRORS=$((ERRORS+1)); }
  done

# 5. .brocode/ in .gitignore
grep -q "^\.brocode/" .gitignore 2>/dev/null \
  || { echo "❌ .gitignore: missing .brocode/ entry"; ERRORS=$((ERRORS+1)); }

if [ $ERRORS -gt 0 ]; then
  echo "validate: $ERRORS error(s) found"
  exit 1
else
  echo "✅ validate: all checks passed"
fi

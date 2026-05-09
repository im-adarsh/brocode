#!/bin/bash
ERRORS=0

# 1. plugin.json parseable
python3 -c "import json,sys; json.load(open('.claude-plugin/plugin.json'))" 2>/dev/null \
  || { echo "❌ plugin.json: invalid JSON"; ERRORS=$((ERRORS+1)); }

# 2. Required agent fields (skip _includes/ companion files)
for f in agents/*.md; do
  grep -q "^# Role:" "$f" \
    || { echo "❌ $f: missing '# Role:' header"; ERRORS=$((ERRORS+1)); }
  grep -q "^\*\*Model:" "$f" \
    || { echo "❌ $f: missing '**Model:**' line"; ERRORS=$((ERRORS+1)); }
done

# 3. Dangerous command scan (unguarded git reset --hard outside update.md)
for f in agents/*.md agents/_includes/**/*.md commands/*.md; do
  [ -f "$f" ] || continue
  if grep -q "git reset --hard" "$f" && [ "$f" != "commands/update.md" ]; then
    echo "⚠️  $f: contains 'git reset --hard' — ensure guard exists"
    ERRORS=$((ERRORS+1))
  fi
done

# 4. Broken internal agent references (top-level agents/*.md only — companions in _includes/ checked separately)
while read ref; do
  [ -f "$ref" ] || { echo "❌ broken reference: $ref"; ERRORS=$((ERRORS+1)); }
done < <(grep -rh "agents/[a-z-]*\.md" agents/ commands/ CLAUDE.md 2>/dev/null \
  | grep -oE "agents/[a-z-]+\.md" | sort -u)

# 4b. Broken include references (agents/_includes/... and skills/brocode/modes/_shared/...)
while read ref; do
  [ -f "$ref" ] || { echo "❌ broken include: $ref"; ERRORS=$((ERRORS+1)); }
done < <(grep -rh -oE "(agents/_includes/[a-z_-]+/[a-z_-]+\.md|skills/brocode/modes/_shared/[a-z_-]+\.md|templates/[a-z_-]+\.md|docs/[a-z_-]+\.md)" \
  agents/ skills/ commands/ CLAUDE.md 2>/dev/null | sort -u)

# 5. .brocode/ in .gitignore
grep -q "^\.brocode/" .gitignore 2>/dev/null \
  || { echo "❌ .gitignore: missing .brocode/ entry"; ERRORS=$((ERRORS+1)); }

if [ $ERRORS -gt 0 ]; then
  echo "validate: $ERRORS error(s) found"
  exit 1
else
  echo "✅ validate: all checks passed"
fi

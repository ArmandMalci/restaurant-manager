#!/usr/bin/env bash
# Reminds the agent to rebuild packages/shared when shared schemas change.
set -euo pipefail

FILE=$(echo "${CLAUDE_TOOL_INPUT:-'{}'}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null || echo "")

if echo "$FILE" | grep -q "packages/shared/src/"; then
  echo "HOOK: packages/shared source changed."
  echo "  -> Rebuild shared: pnpm --filter @restaurant/shared build"
  echo "  -> Regenerate Orval: pnpm --filter @restaurant/web orval"
fi

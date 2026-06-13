#!/usr/bin/env bash
# Reminds the agent to regenerate Orval when API controller files change.
set -euo pipefail

FILE=$(echo "${CLAUDE_TOOL_INPUT:-'{}'}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null || echo "")

# Only trigger on controller files -- they define routes exposed in the OpenAPI spec
if echo "$FILE" | grep -qE "apps/api/src/.+\.controller\.ts$"; then
  echo "HOOK: API controller changed."
  echo "  -> Regenerate Orval (after API restart): pnpm --filter @restaurant/web orval"
  echo "  -> Verify Swagger docs at http://localhost:3000/docs"
fi

#!/usr/bin/env bash
# Reminds the agent to run a Prisma migration when prisma/schema.prisma is edited.
set -euo pipefail

# CLAUDE_TOOL_INPUT is JSON like {"file_path": "...", ...}
FILE=$(echo "${CLAUDE_TOOL_INPUT:-'{}'}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null || echo "")

if echo "$FILE" | grep -q "prisma/schema\.prisma"; then
  echo "HOOK: prisma/schema.prisma changed."
  echo "  -> Run migration: pnpm --filter @restaurant/api exec prisma migrate dev --name <descriptive-name> --schema=../../prisma/schema.prisma"
  echo "  -> Regenerate client: pnpm --filter @restaurant/api exec prisma generate --schema=../../prisma/schema.prisma"
fi

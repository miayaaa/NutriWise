#!/usr/bin/env bash
set -e

# -----------------------------------------------
# One-click database migration script
# Usage: ./scripts/migrate.sh [migration_name]
# -----------------------------------------------

MIGRATION_NAME="${1:-add_food_log_fields}"

echo ">>> [1/3] Generating Prisma client..."
pnpm prisma generate

echo ">>> [2/3] Running migration: $MIGRATION_NAME"
pnpm prisma migrate dev --name "$MIGRATION_NAME"

echo ">>> [3/3] Done. Schema synced to database."
echo ""
echo "New fields added to activity_log:"
echo "  - food_description (Text, nullable)"
echo "  - ai_calories      (Float, nullable)"

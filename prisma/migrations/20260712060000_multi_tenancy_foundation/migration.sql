-- Multi-tenancy foundation (ADR-002 / Plan 22 Task 1).
--
-- Hand-authored (not `prisma migrate dev`-generated) because this environment has no
-- DATABASE_URL to introspect against. Mirrors the backfill pattern used in
-- 20260712015416_add_sections/migration.sql: add nullable -> backfill -> enforce NOT NULL.
--
-- Precondition: Tier 0's `prisma migrate reset` has already run once, so the DB currently
-- has data seeded by the OLD (pre-Task-1) seed.ts — this migration backfills that data into
-- one placeholder restaurant. The rewritten seed.ts wipes and recreates everything
-- (including the restaurant row, at the same fixed id) immediately after, so the exact
-- placeholder values here are transient, not final.

-- ============================================================================
-- CreateTable: tenant root + platform principal
-- ============================================================================

CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Restaurant',
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "openingHours" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "exchangeRates" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- ============================================================================
-- Seed one placeholder restaurant to backfill every existing row into.
-- Copies the current `restaurant_settings` singleton row's values if one exists
-- (preserves whatever a developer already edited via the Settings screen);
-- falls back to defaults if that table is empty.
-- Fixed id matches `FIRST_RESTAURANT_ID` in the rewritten prisma/seed.ts, so a
-- dev's bookmarked `/{restaurantId}/...` URL survives the follow-up reseed.
-- ============================================================================

INSERT INTO "restaurants" ("id", "name", "description", "phone", "email", "address", "openingHours", "baseCurrency", "exchangeRates", "updatedAt")
SELECT '00000000-0000-0000-0000-000000000001', "name", "description", "phone", "email", "address", "openingHours", "baseCurrency", "exchangeRates", CURRENT_TIMESTAMP
FROM "restaurant_settings" WHERE "id" = 'default';

INSERT INTO "restaurants" ("id", "updatedAt")
SELECT '00000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "restaurants");

-- ============================================================================
-- Staff: restaurantId + username backfill
-- ============================================================================

ALTER TABLE "staff" ADD COLUMN "restaurantId" TEXT,
ADD COLUMN "username" TEXT;

UPDATE "staff" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
-- Backfill username from email (already globally unique, so trivially unique per-restaurant
-- too) — a real human-typeable username is a follow-up admin task, not this migration's job.
UPDATE "staff" SET "username" = "email" WHERE "username" IS NULL;

ALTER TABLE "staff" ALTER COLUMN "restaurantId" SET NOT NULL,
ALTER COLUMN "username" SET NOT NULL;

-- ============================================================================
-- Section: restaurantId backfill (Plan 17 added Section without one; this closes that gap)
-- ============================================================================

ALTER TABLE "sections" ADD COLUMN "restaurantId" TEXT;
UPDATE "sections" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "sections" ALTER COLUMN "restaurantId" SET NOT NULL;

-- ============================================================================
-- Table: restaurantId backfill + number uniqueness becomes per-restaurant
-- ============================================================================

ALTER TABLE "tables" ADD COLUMN "restaurantId" TEXT;
UPDATE "tables" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "tables" ALTER COLUMN "restaurantId" SET NOT NULL;

-- `number` was globally unique; a second tenant must be able to have its own "Table 1".
DROP INDEX "tables_number_key";

-- ============================================================================
-- MenuCategory / MenuItem / ModifierGroup / ModifierOption: restaurantId backfill
-- ============================================================================

ALTER TABLE "menu_categories" ADD COLUMN "restaurantId" TEXT;
UPDATE "menu_categories" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "menu_categories" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "menu_items" ADD COLUMN "restaurantId" TEXT;
UPDATE "menu_items" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "menu_items" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "modifier_groups" ADD COLUMN "restaurantId" TEXT;
UPDATE "modifier_groups" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "modifier_groups" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "modifier_options" ADD COLUMN "restaurantId" TEXT;
UPDATE "modifier_options" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "modifier_options" ALTER COLUMN "restaurantId" SET NOT NULL;

-- ============================================================================
-- Order / Reservation / Shift / InventoryItem: restaurantId backfill
-- ============================================================================

ALTER TABLE "orders" ADD COLUMN "restaurantId" TEXT;
UPDATE "orders" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "reservations" ADD COLUMN "restaurantId" TEXT;
UPDATE "reservations" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "reservations" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "shifts" ADD COLUMN "restaurantId" TEXT;
UPDATE "shifts" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "shifts" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "inventory_items" ADD COLUMN "restaurantId" TEXT;
UPDATE "inventory_items" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "inventory_items" ALTER COLUMN "restaurantId" SET NOT NULL;

-- ============================================================================
-- Drop the folded model
-- ============================================================================

DROP TABLE "restaurant_settings";

-- ============================================================================
-- CreateIndex (restaurantId lookup index on every scoped table + the new
-- per-restaurant unique constraints replacing/joining prior global ones)
-- ============================================================================

CREATE INDEX "staff_restaurantId_idx" ON "staff"("restaurantId");
CREATE UNIQUE INDEX "staff_restaurantId_username_key" ON "staff"("restaurantId", "username");

CREATE INDEX "sections_restaurantId_idx" ON "sections"("restaurantId");

CREATE INDEX "tables_restaurantId_idx" ON "tables"("restaurantId");
CREATE UNIQUE INDEX "tables_restaurantId_number_key" ON "tables"("restaurantId", "number");

CREATE INDEX "menu_categories_restaurantId_idx" ON "menu_categories"("restaurantId");
CREATE INDEX "menu_items_restaurantId_idx" ON "menu_items"("restaurantId");
CREATE INDEX "modifier_groups_restaurantId_idx" ON "modifier_groups"("restaurantId");
CREATE INDEX "modifier_options_restaurantId_idx" ON "modifier_options"("restaurantId");
CREATE INDEX "orders_restaurantId_idx" ON "orders"("restaurantId");
CREATE INDEX "reservations_restaurantId_idx" ON "reservations"("restaurantId");
CREATE INDEX "shifts_restaurantId_idx" ON "shifts"("restaurantId");
CREATE INDEX "inventory_items_restaurantId_idx" ON "inventory_items"("restaurantId");

-- ============================================================================
-- AddForeignKey
-- ============================================================================

ALTER TABLE "staff" ADD CONSTRAINT "staff_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sections" ADD CONSTRAINT "sections_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

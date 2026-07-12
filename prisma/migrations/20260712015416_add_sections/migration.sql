-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- Seed a default section so the existing tables below have somewhere to backfill into.
INSERT INTO "sections" ("id", "name", "sortOrder") VALUES (gen_random_uuid()::text, 'Main Room', 0);

-- AlterTable: add columns nullable first — `sectionId` can't be NOT NULL yet because
-- existing rows need to be backfilled before the constraint can be enforced.
ALTER TABLE "tables" ADD COLUMN     "name" TEXT,
ADD COLUMN     "sectionId" TEXT;

-- Backfill every existing table into the default section created above.
UPDATE "tables" SET "sectionId" = (SELECT "id" FROM "sections" LIMIT 1) WHERE "sectionId" IS NULL;

-- Now that every row has a value, enforce NOT NULL.
ALTER TABLE "tables" ALTER COLUMN "sectionId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: add spatial layout fields to tables (additive, nullable + defaulted)
ALTER TABLE "tables" ADD COLUMN "posX" DOUBLE PRECISION;
ALTER TABLE "tables" ADD COLUMN "posY" DOUBLE PRECISION;
ALTER TABLE "tables" ADD COLUMN "shape" TEXT NOT NULL DEFAULT 'square';

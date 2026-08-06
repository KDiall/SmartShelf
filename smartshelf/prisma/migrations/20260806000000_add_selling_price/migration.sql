-- AlterTable: add a manually-managed selling price to each medicine.
-- Existing stock has no selling price yet, so backfill from cost so the
-- POS checkout has a working total until the pharmacist sets real prices.
ALTER TABLE "Medicine" ADD COLUMN "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "Medicine" SET "sellingPrice" = "costPerUnit" WHERE "sellingPrice" = 0;

-- AlterTable: snapshot the unit price on each sale for historical accuracy.
ALTER TABLE "Sale" ADD COLUMN "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

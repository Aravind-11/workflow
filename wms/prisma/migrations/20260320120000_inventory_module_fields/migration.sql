-- CreateEnum
CREATE TYPE "InventoryBalanceStatus" AS ENUM ('AVAILABLE', 'HOLD', 'DAMAGED', 'QUARANTINE');

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "reorderPoint" INTEGER;

-- AlterTable
ALTER TABLE "InventoryBalance" ADD COLUMN IF NOT EXISTS "status" "InventoryBalanceStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "InventoryTransaction" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_barcode_key" ON "InventoryItem"("barcode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryItem_category_idx" ON "InventoryItem"("category");

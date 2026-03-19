-- DropIndex
DROP INDEX "InventoryItem_category_idx";

-- AlterTable
ALTER TABLE "Receipt" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

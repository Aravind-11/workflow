-- CreateEnum
CREATE TYPE "ReceiptLineCondition" AS ENUM ('GOOD', 'DAMAGED', 'HOLD', 'REJECTED');

-- CreateEnum
CREATE TYPE "InboundLineStatus" AS ENUM ('PENDING', 'INSPECTED', 'PUTAWAY_COMPLETE');

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "deliveryId" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "Receipt_deliveryId_idx" ON "Receipt"("deliveryId");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ReceiptLine" ADD COLUMN     "condition" "ReceiptLineCondition" NOT NULL DEFAULT 'GOOD',
ADD COLUMN     "inboundStatus" "InboundLineStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "serviceLevel" TEXT;

-- AlterTable
ALTER TABLE "DockAppointment" ADD COLUMN     "checkedInAt" TIMESTAMP(3);

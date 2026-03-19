-- AlterEnum: add AUTHORIZED (PostgreSQL)
ALTER TYPE "ReturnStatus" ADD VALUE 'AUTHORIZED';

-- CreateEnum
CREATE TYPE "ReturnDisposition" AS ENUM ('RESTOCK', 'REFURBISH', 'QUARANTINE', 'SCRAP', 'RETURN_TO_VENDOR');

-- AlterTable
ALTER TABLE "ReturnRMA" ADD COLUMN     "shipmentId" TEXT,
ADD COLUMN     "originalOrderRef" TEXT,
ADD COLUMN     "exceptionReasonCode" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "ReturnRMA_shipmentId_idx" ON "ReturnRMA"("shipmentId");

-- AddForeignKey
ALTER TABLE "ReturnRMA" ADD CONSTRAINT "ReturnRMA_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ReturnLine" ADD COLUMN     "receivedQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dispositionType" "ReturnDisposition",
ADD COLUMN     "dispositionNote" TEXT,
ADD COLUMN     "restockLocationId" TEXT,
ADD COLUMN     "inventoryAppliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ReturnLine_restockLocationId_idx" ON "ReturnLine"("restockLocationId");

-- AddForeignKey
ALTER TABLE "ReturnLine" ADD CONSTRAINT "ReturnLine_restockLocationId_fkey" FOREIGN KEY ("restockLocationId") REFERENCES "WarehouseLocationHierarchy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ReturnComment" (
    "id" TEXT NOT NULL,
    "returnRmaId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnComment_returnRmaId_createdAt_idx" ON "ReturnComment"("returnRmaId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReturnComment" ADD CONSTRAINT "ReturnComment_returnRmaId_fkey" FOREIGN KEY ("returnRmaId") REFERENCES "ReturnRMA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnComment" ADD CONSTRAINT "ReturnComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

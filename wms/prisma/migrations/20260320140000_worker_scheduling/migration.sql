-- CreateEnum
CREATE TYPE "ScheduleConfirmation" AS ENUM ('TENTATIVE', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "TimeOffStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DENIED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "confirmationStatus" "ScheduleConfirmation" NOT NULL DEFAULT 'TENTATIVE',
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "breakMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalWorkedMinutes" INTEGER;

-- CreateIndex
CREATE INDEX "Schedule_locationId_idx" ON "Schedule"("locationId");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocationHierarchy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TimeOffBlock" (
    "id" TEXT NOT NULL,
    "workerProfileId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "TimeOffStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOffBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeOffBlock_workerProfileId_startAt_idx" ON "TimeOffBlock"("workerProfileId", "startAt");

-- CreateIndex
CREATE INDEX "TimeOffBlock_warehouseId_startAt_idx" ON "TimeOffBlock"("warehouseId", "startAt");

-- AddForeignKey
ALTER TABLE "TimeOffBlock" ADD CONSTRAINT "TimeOffBlock_workerProfileId_fkey" FOREIGN KEY ("workerProfileId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffBlock" ADD CONSTRAINT "TimeOffBlock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

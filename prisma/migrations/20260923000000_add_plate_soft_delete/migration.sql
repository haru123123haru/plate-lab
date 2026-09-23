-- AlterTable
ALTER TABLE "Plate" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Plate_userId_deletedAt_idx" ON "Plate"("userId", "deletedAt");

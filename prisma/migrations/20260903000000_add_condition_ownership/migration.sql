-- AlterTable
ALTER TABLE "ConditionTemplate"
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "createdById" TEXT;

-- AlterTable
ALTER TABLE "ConditionSet"
ADD COLUMN "createdById" TEXT;

-- Existing condition data was seeded as shared/default data.
UPDATE "ConditionTemplate" SET "isDefault" = true;
UPDATE "ConditionSet" SET "isDefault" = true;

-- CreateIndex
CREATE INDEX "ConditionTemplate_isDefault_idx"
ON "ConditionTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "ConditionTemplate_createdById_idx"
ON "ConditionTemplate"("createdById");

-- CreateIndex
CREATE INDEX "ConditionSet_isDefault_idx"
ON "ConditionSet"("isDefault");

-- CreateIndex
CREATE INDEX "ConditionSet_createdById_idx"
ON "ConditionSet"("createdById");

-- AddForeignKey
ALTER TABLE "ConditionTemplate"
ADD CONSTRAINT "ConditionTemplate_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionSet"
ADD CONSTRAINT "ConditionSet_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

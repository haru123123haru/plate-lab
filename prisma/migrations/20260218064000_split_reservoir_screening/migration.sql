-- DropForeignKey
ALTER TABLE "Plate" DROP CONSTRAINT "Plate_templateId_fkey";

-- AlterTable
ALTER TABLE "Plate" DROP COLUMN "templateId",
ADD COLUMN     "reservoirTemplateId" INTEGER,
ADD COLUMN     "sampleName" TEXT,
ADD COLUMN     "screeningTemplateId" INTEGER;

-- AddForeignKey
ALTER TABLE "Plate" ADD CONSTRAINT "Plate_reservoirTemplateId_fkey" FOREIGN KEY ("reservoirTemplateId") REFERENCES "ConditionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plate" ADD CONSTRAINT "Plate_screeningTemplateId_fkey" FOREIGN KEY ("screeningTemplateId") REFERENCES "ConditionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

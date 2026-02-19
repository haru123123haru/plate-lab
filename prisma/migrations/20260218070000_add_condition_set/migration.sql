-- CreateTable
CREATE TABLE "ConditionSet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "reservoirTemplateId" INTEGER NOT NULL,
    "screeningTemplateId" INTEGER NOT NULL,

    CONSTRAINT "ConditionSet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConditionSet" ADD CONSTRAINT "ConditionSet_reservoirTemplateId_fkey" FOREIGN KEY ("reservoirTemplateId") REFERENCES "ConditionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionSet" ADD CONSTRAINT "ConditionSet_screeningTemplateId_fkey" FOREIGN KEY ("screeningTemplateId") REFERENCES "ConditionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

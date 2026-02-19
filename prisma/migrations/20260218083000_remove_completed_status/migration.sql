-- COMPLETED のプレートを ARCHIVED に変更
UPDATE "Plate" SET "status" = 'ARCHIVED' WHERE "status" = 'COMPLETED';

-- PlateStatus enum から COMPLETED を削除
ALTER TYPE "PlateStatus" RENAME TO "PlateStatus_old";
CREATE TYPE "PlateStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
ALTER TABLE "Plate" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Plate" ALTER COLUMN "status" TYPE "PlateStatus" USING ("status"::text::"PlateStatus");
ALTER TABLE "Plate" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "PlateStatus_old";

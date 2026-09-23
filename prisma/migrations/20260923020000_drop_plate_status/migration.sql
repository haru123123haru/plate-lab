-- アーカイブ廃止の後始末。status はコードから参照されなくなり、
-- アーカイブ済みのプレートは 20260923010000_archive_to_trash でゴミ箱へ移し済み。

-- AlterTable
ALTER TABLE "Plate" DROP COLUMN "status";

-- DropEnum
DROP TYPE "PlateStatus";

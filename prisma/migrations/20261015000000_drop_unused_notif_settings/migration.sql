-- 使っていない通知の設定の列を消す。コードからは前の変更（#49）で外した
-- AlterTable
ALTER TABLE "UserSettings" DROP COLUMN "notifNewPlate",
DROP COLUMN "notifStatus";

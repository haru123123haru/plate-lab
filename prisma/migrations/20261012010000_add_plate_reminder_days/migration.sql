-- 仕込みから何日目に観察のリマインドを送るか。今あるプレートにも 7 が入る
-- AlterTable
ALTER TABLE "Plate" ADD COLUMN     "reminderDays" INTEGER DEFAULT 7;

-- リマインドは既定で送る。これまで画面に出しておらず、誰も選んでいないので、今の行もオンにする
-- AlterTable
ALTER TABLE "UserSettings" ALTER COLUMN "notifReminder" SET DEFAULT true;
UPDATE "UserSettings" SET "notifReminder" = true;

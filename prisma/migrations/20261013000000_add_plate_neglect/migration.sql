-- 30日観察していないプレートの知らせ。メモを書き換えた日と、知らせた分を記録する
-- AlterTable
ALTER TABLE "Plate" ADD COLUMN     "neglectSentFor" DATE,
ADD COLUMN     "notesUpdatedAt" DATE;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "notifNeglect" BOOLEAN NOT NULL DEFAULT true;

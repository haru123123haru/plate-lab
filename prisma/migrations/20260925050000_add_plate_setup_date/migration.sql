-- 実験を仕込んだ日。アプリを使う前からあるプレートも登録できるよう、作成日とは別に持つ。
-- 既存のプレートには作成日を入れる。createdAt は UTC なので、日本時間に直してから日付にする
-- （そのまま ::date にすると、日本時間の0〜9時に作ったプレートが前日になる）

-- AlterTable
ALTER TABLE "Plate" ADD COLUMN "setupDate" DATE;

UPDATE "Plate" SET "setupDate" = ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')::date;

ALTER TABLE "Plate" ALTER COLUMN "setupDate" SET NOT NULL;

-- 観察に結晶化の目印を付ける。良い順は HARVESTED > CRYSTAL > POSSIBLE。
-- ウェルからドロップへ移したとき（20260925020000_move_wells_to_drops）、ウェルの status は
-- ドロップのメモに 'Status: CRYSTAL' のような行で詰めてある。CRYSTAL だけを「結晶あり」の観察として移す
-- （PRECIPITATE と CLEAR は目印のどれにも当たらない）。メモの行は消さない。
-- 元の status をいつ付けたかは残っていないので、観察日はプレートの仕込み日にする。
-- Prisma の @default(uuid()) は DB の DEFAULT にならないので、id は SQL で渡す。
-- 同じ観察がすでにあれば入れないので、流し直しても増えない

-- CreateEnum
CREATE TYPE "CrystalMark" AS ENUM ('POSSIBLE', 'CRYSTAL', 'HARVESTED');

-- AlterTable
ALTER TABLE "Observation" ADD COLUMN "mark" "CrystalMark";

INSERT INTO "Observation" ("id", "dropId", "observedAt", "notes", "mark")
SELECT
  gen_random_uuid()::text,
  d."id",
  p."setupDate",
  'Migrated from notes (Status: CRYSTAL)',
  'CRYSTAL'
FROM "Drop" d
JOIN "Well" w ON w."id" = d."wellId"
JOIN "Plate" p ON p."id" = w."plateId"
-- 行まるごと一致だけを拾う（メモの本文に偶然含まれる文字は拾わない）
WHERE d."notes" ~ '(^|\n)Status: CRYSTAL(\n|$)'
  AND NOT EXISTS (
    SELECT 1 FROM "Observation" o
    WHERE o."dropId" = d."id"
      AND o."notes" = 'Migrated from notes (Status: CRYSTAL)'
  );

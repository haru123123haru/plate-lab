-- プレートの形（行数・列数・最大ドロップ数・描き方）を PlateType に持たせ、
-- ドロップと観察のテーブルを作る。既存データは変えない（足すだけ）。

-- CreateEnum
CREATE TYPE "PlateLayout" AS ENUM ('SITTING', 'HANGING');

-- 既存の行があるので、NULL を許して足す → 埋める → NOT NULL を付ける の順で入れる
ALTER TABLE "PlateType" ADD COLUMN "rows" INTEGER,
ADD COLUMN "cols" INTEGER,
ADD COLUMN "maxDrops" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "layout" "PlateLayout";

-- 形は今まで wellCount から推測していた（24 → 4×6、96 → 8×12）。
-- それ以外の wellCount があると rows / cols が NULL のまま残り、下の SET NOT NULL で止まる。
-- 黙って誤った形を入れるより、止まるほうがよい
UPDATE "PlateType"
SET "rows" = CASE "wellCount" WHEN 24 THEN 4 WHEN 96 THEN 8 END,
    "cols" = CASE "wellCount" WHEN 24 THEN 6 WHEN 96 THEN 12 END,
    "layout" = CASE WHEN "name" ILIKE '%hanging%' THEN 'HANGING'::"PlateLayout" ELSE 'SITTING'::"PlateLayout" END;

ALTER TABLE "PlateType" ALTER COLUMN "rows" SET NOT NULL,
ALTER COLUMN "cols" SET NOT NULL,
ALTER COLUMN "layout" SET NOT NULL;

-- CreateTable
CREATE TABLE "Drop" (
    "id" TEXT NOT NULL,
    "wellId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "sampleName" TEXT NOT NULL,
    "concentration" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "dropId" TEXT NOT NULL,
    "observedAt" DATE NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Drop_wellId_slot_key" ON "Drop"("wellId", "slot");

-- CreateIndex
CREATE INDEX "Observation_dropId_observedAt_idx" ON "Observation"("dropId", "observedAt");

-- AddForeignKey
ALTER TABLE "Drop" ADD CONSTRAINT "Drop_wellId_fkey" FOREIGN KEY ("wellId") REFERENCES "Well"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 既存のテーブル（supabase/migrations/20260219_enable_rls.sql）とそろえる。
-- テーブルの持ち主の postgres は RLS を素通りするので、アプリの動作は変わらない
ALTER TABLE "Drop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Observation" ENABLE ROW LEVEL SECURITY;

-- 20260924000000_revoke_data_api_access の ALTER DEFAULT PRIVILEGES は、実行したロールが
-- 作るテーブルにしか効かない。新しいテーブルは念のため個別に外す
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "Drop", "Observation" FROM anon, authenticated;
  END IF;
END $$;

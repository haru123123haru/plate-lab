-- ============================================
-- RLS (Row Level Security) ポリシー設定
-- ============================================

-- ==================
-- User テーブル
-- ==================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON "User" FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update own data"
  ON "User" FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ==================
-- UserSettings テーブル
-- ==================
ALTER TABLE "UserSettings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON "UserSettings" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own settings"
  ON "UserSettings" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own settings"
  ON "UserSettings" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ==================
-- Plate テーブル
-- ==================
ALTER TABLE "Plate" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plates"
  ON "Plate" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own plates"
  ON "Plate" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own plates"
  ON "Plate" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own plates"
  ON "Plate" FOR DELETE
  USING (auth.uid()::text = "userId");

-- ==================
-- Well テーブル（プレート経由で認可）
-- ==================
ALTER TABLE "Well" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wells"
  ON "Well" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Plate"
      WHERE "Plate".id = "Well"."plateId"
        AND "Plate"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own wells"
  ON "Well" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Plate"
      WHERE "Plate".id = "Well"."plateId"
        AND "Plate"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own wells"
  ON "Well" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Plate"
      WHERE "Plate".id = "Well"."plateId"
        AND "Plate"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own wells"
  ON "Well" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Plate"
      WHERE "Plate".id = "Well"."plateId"
        AND "Plate"."userId" = auth.uid()::text
    )
  );

-- ==================
-- PlateType テーブル（デフォルトは全員閲覧可、カスタムは作成者のみ）
-- ==================
ALTER TABLE "PlateType" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read default plate types"
  ON "PlateType" FOR SELECT
  USING ("isDefault" = true OR "createdById" = auth.uid()::text);

CREATE POLICY "Users can insert own plate types"
  ON "PlateType" FOR INSERT
  WITH CHECK (auth.uid()::text = "createdById");

CREATE POLICY "Users can delete own plate types"
  ON "PlateType" FOR DELETE
  USING ("isDefault" = false AND "createdById" = auth.uid()::text);

-- ==================
-- ConditionTemplate テーブル（共有リソース：全員閲覧・作成可）
-- ==================
ALTER TABLE "ConditionTemplate" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read templates"
  ON "ConditionTemplate" FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can insert templates"
  ON "ConditionTemplate" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can delete templates"
  ON "ConditionTemplate" FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ==================
-- ConditionSet テーブル（共有リソース）
-- ==================
ALTER TABLE "ConditionSet" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read sets"
  ON "ConditionSet" FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can insert sets"
  ON "ConditionSet" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can delete non-default sets"
  ON "ConditionSet" FOR DELETE
  USING (auth.uid() IS NOT NULL AND "isDefault" = false);

-- ==================
-- TemplateWell テーブル（共有リソース）
-- ==================
ALTER TABLE "TemplateWell" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read template wells"
  ON "TemplateWell" FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can insert template wells"
  ON "TemplateWell" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can delete template wells"
  ON "TemplateWell" FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ==================
-- Prisma (service_role) 用：RLSをバイパス
-- Note: Prisma は service_role キーで接続するため、
-- アプリケーション層の認可チェックが主な防御線。
-- RLS は DB 直接アクセスに対する二重防御。
-- ==================

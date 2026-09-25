-- 96ウェルの共有種別を入れる（prisma/seed.ts と同じ値）。本番には最初から入っていなかった。
-- 20260925010000_add_multi_drop_plate_types と同じく、同じ名前の共有種別がすでにあれば入れない
INSERT INTO "PlateType" ("id", "name", "rows", "cols", "maxDrops", "layout", "description", "isDefault")
SELECT gen_random_uuid()::text, '96 Well - Sitting', 8, 12, 1, 'SITTING'::"PlateLayout", 'Standard 96-well sitting drop plate', true
WHERE NOT EXISTS (
  SELECT 1 FROM "PlateType" p WHERE p."isDefault" AND p."name" = '96 Well - Sitting'
);

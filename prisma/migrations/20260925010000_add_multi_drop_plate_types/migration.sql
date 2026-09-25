-- 1ウェルに複数のドロップを置く共有種別を2つ入れる（prisma/seed.ts と同じ値）。
-- 本番の種別は手作業で作られているので、同じ名前の共有種別がすでにあれば入れない。
-- Prisma の @default(uuid()) は DB の DEFAULT にならないので、id は SQL で渡す
INSERT INTO "PlateType" ("id", "name", "wellCount", "rows", "cols", "maxDrops", "layout", "description", "isDefault")
SELECT gen_random_uuid()::text, v."name", v."rows" * v."cols", v."rows", v."cols", v."maxDrops", v."layout"::"PlateLayout", v."description", true
FROM (VALUES
  ('24 Well - Sitting 4 Drop', 4, 6, 4, 'SITTING', '24-well sitting drop plate with 4 drop positions per well'),
  ('15 Well - Hanging 3 Drop', 3, 5, 3, 'HANGING', '15-well hanging drop plate with up to 3 drops per well')
) AS v("name", "rows", "cols", "maxDrops", "layout", "description")
WHERE NOT EXISTS (
  SELECT 1 FROM "PlateType" p WHERE p."isDefault" AND p."name" = v."name"
);

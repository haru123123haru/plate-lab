-- 記録の単位をウェルからドロップへ移す。使用中（status != 'EMPTY'）のウェルすべてに、
-- 1番の置き場所のドロップを作る。サンプル名が無いウェルも対象にする（絞ると「使用中」が消える）。
-- Prisma の @default(uuid()) と @updatedAt は DB の DEFAULT にならないので、id と updatedAt は SQL で渡す。
-- ウェルの残りの記録欄（buffer・ph・precipitant・notes）と観察結果の status は、あとで列ごと消すので
-- ドロップのメモに詰めて残す。本番の中身は確かめられないため、失わない側に倒す。
-- シートですでに1番へドロップを足したウェルは、一意制約とぶつかるので飛ばす
-- （ぶつかったまま止まると migrate deploy ごと失敗し、Vercel のビルドが落ちる）
INSERT INTO "Drop" ("id", "wellId", "slot", "sampleName", "concentration", "notes", "updatedAt")
SELECT
  gen_random_uuid()::text,
  w."id",
  1,
  COALESCE(NULLIF(TRIM(p."sampleName"), ''), NULLIF(TRIM(w."protein"), ''), '-'),
  COALESCE(NULLIF(TRIM(w."concentration"), ''), '-'),
  -- CONCAT_WS は NULL を飛ばす。'Buffer: ' || NULL は NULL になる
  NULLIF(CONCAT_WS(E'\n',
    CASE WHEN w."status" IN ('CRYSTAL', 'PRECIPITATE', 'CLEAR') THEN 'Status: ' || w."status" END,
    'Buffer: ' || NULLIF(TRIM(w."buffer"), ''),
    'pH: ' || NULLIF(TRIM(w."ph"), ''),
    'Precipitant: ' || NULLIF(TRIM(w."precipitant"), ''),
    NULLIF(TRIM(w."notes"), '')
  ), ''),
  now()
FROM "Well" w
JOIN "Plate" p ON p."id" = w."plateId"
WHERE w."status" <> 'EMPTY'
ON CONFLICT ("wellId", "slot") DO NOTHING;

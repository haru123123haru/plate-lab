-- 検索で、打ち間違いや表記の揺れがあっても似ている名前を見つけるため（lib/actions/plates.ts の searchPlates）。
-- Supabase の決まりに合わせて extensions スキーマに入れる。すでに別のスキーマに入っていても動くよう、
-- 呼ぶ側はスキーマを付けずに search_path（public, extensions）で引く。データが少ないので索引は作らない
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

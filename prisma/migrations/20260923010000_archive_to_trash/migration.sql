-- アーカイブを廃止してゴミ箱に一本化する。アーカイブ済みのプレートはゴミ箱へ移す。
-- 移動日には最後に更新した日時を使う（この UPDATE は Prisma の @updatedAt を通らないので updatedAt 自体は変わらない）。
-- status カラムは、旧コードが動いている間も壊れないようにまだ残す。削除は別のマイグレーションで行う。
UPDATE "Plate"
SET "deletedAt" = "updatedAt"
WHERE "status" = 'ARCHIVED' AND "deletedAt" IS NULL;

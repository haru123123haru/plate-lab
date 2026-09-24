-- 記録の単位がドロップに移ったので、役割の終わった欄を消す。戻せない変更。
-- Well の記録欄と観察結果の status は、20260925020000_move_wells_to_drops でドロップのメモへ移してある。
-- PlateType.wellCount は rows × cols と同じ値なので、消しても失う情報は無い

-- AlterTable
ALTER TABLE "Plate" DROP COLUMN "sampleName";

-- AlterTable
ALTER TABLE "PlateType" DROP COLUMN "wellCount";

-- AlterTable
ALTER TABLE "Well" DROP COLUMN "buffer",
DROP COLUMN "concentration",
DROP COLUMN "notes",
DROP COLUMN "ph",
DROP COLUMN "precipitant",
DROP COLUMN "protein",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "WellStatus";

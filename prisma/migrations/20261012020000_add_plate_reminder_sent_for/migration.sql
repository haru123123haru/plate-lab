-- リマインドを送った「リマインドの日」。Cron が二度呼ばれても、同じ分を二度送らない
-- AlterTable
ALTER TABLE "Plate" ADD COLUMN     "reminderSentFor" DATE;

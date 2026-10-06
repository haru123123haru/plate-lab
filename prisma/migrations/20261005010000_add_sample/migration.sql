-- サンプルの見た目（アイコンと色）。見た目を変えたサンプルだけ行を持つ
-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sample_userId_name_key" ON "Sample"("userId", "name");

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


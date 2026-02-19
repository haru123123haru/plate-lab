import { PrismaClient, PlateStatus, WellStatus } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

/** conditions/*.md のマークダウンテーブルをパースして Well データに変換 */
function parseConditionMd(
  filePath: string
): { position: string; composition: string }[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.trim().split("\n");
  const results: { position: string; composition: string }[] = [];

  for (const line of lines) {
    // ヘッダー行・区切り行をスキップ
    if (line.startsWith("| Well") || line.startsWith("| ----")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 5) continue;

    const [position, salt, precipitant, polyamine, buffer] = cells;
    const composition = JSON.stringify({
      salt,
      precipitant,
      polyamine,
      buffer,
    });
    results.push({ position, composition });
  }

  return results;
}

function generateWells(
  rows: number,
  cols: number,
  filledCount: number
): {
  position: string;
  row: number;
  col: number;
  status: WellStatus;
  protein?: string;
  concentration?: string;
  buffer?: string;
  ph?: string;
  precipitant?: string;
}[] {
  const wells: ReturnType<typeof generateWells> = [];
  const rowLabels = "ABCDEFGH";
  let filled = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isFilled = filled < filledCount;
      wells.push({
        position: `${rowLabels[r]}${c + 1}`,
        row: r,
        col: c,
        status: isFilled ? WellStatus.FILLED : WellStatus.EMPTY,
        ...(isFilled && {
          protein: "Lysozyme",
          concentration: "10 mg/mL",
          buffer: "Tris-HCl",
          ph: "7.5",
          precipitant: "NaCl 1M",
        }),
      });
      filled++;
    }
  }
  return wells;
}

async function main() {
  // 既存データをクリア（依存順）
  await prisma.well.deleteMany();
  await prisma.plate.deleteMany();
  await prisma.conditionSet.deleteMany();
  await prisma.templateWell.deleteMany();
  await prisma.conditionTemplate.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.plateType.deleteMany();
  await prisma.user.deleteMany();

  // 開発用ユーザー（本番では Supabase Auth が UUID を生成し、signUp 時に Prisma User が作成される）
  const user = await prisma.user.create({
    data: {
      id: "user-001",
      name: "Tanaka Yuki",
      email: "y.tanaka@lab.ac.jp",
      role: "Research Associate",
      organization: "Tokyo Institute of Technology",
      bio: "Specializing in protein crystallography and structural biology.",
      settings: {
        create: {
          language: "en",
          appearance: "light",
          notifNewPlate: true,
          notifStatus: true,
          notifReminder: false,
        },
      },
    },
  });

  // プレートタイプ
  const pt96Sitting = await prisma.plateType.create({
    data: {
      name: "96 Well - Sitting",
      wellCount: 96,
      description: "Standard 96-well sitting drop plate",
      isDefault: true,
    },
  });

  const pt24Hanging = await prisma.plateType.create({
    data: {
      name: "24 Well - Hanging",
      wellCount: 24,
      description: "24-well hanging drop plate",
      isDefault: true,
    },
  });

  await prisma.plateType.create({
    data: {
      name: "Sitting Manual",
      wellCount: 96,
      description: "Manual sitting drop plate",
      isDefault: true,
    },
  });

  // 条件テンプレート（PEG / MPD スクリーニング）
  const conditionsDir = path.join(process.cwd(), "conditions");

  const pegWells = parseConditionMd(path.join(conditionsDir, "peg.md"));
  const ctPeg = await prisma.conditionTemplate.create({
    data: {
      name: "PEG",
      description:
        "96-well screen — 10% PEG3350, Salt gradient (LiCl→BaCl₂) × Polyamine (Spermine / [Co(NH₃)₆]Cl₃)",
      wells: {
        create: pegWells.map((w) => ({
          position: w.position,
          composition: w.composition,
        })),
      },
    },
  });

  const mpdWells = parseConditionMd(path.join(conditionsDir, "mpd.md"));
  const ctMpd = await prisma.conditionTemplate.create({
    data: {
      name: "MPD",
      description:
        "96-well screen — 10% MPD, Salt gradient (LiCl→BaCl₂) × Polyamine (Spermine / [Co(NH₃)₆]Cl₃)",
      wells: {
        create: mpdWells.map((w) => ({
          position: w.position,
          composition: w.composition,
        })),
      },
    },
  });

  // デフォルト条件セット（Reservoir + Screening のペア）
  await prisma.conditionSet.create({
    data: {
      name: "PEG Set",
      isDefault: true,
      reservoirTemplateId: ctPeg.id,
      screeningTemplateId: ctPeg.id,
    },
  });
  await prisma.conditionSet.create({
    data: {
      name: "MPD Set",
      isDefault: true,
      reservoirTemplateId: ctMpd.id,
      screeningTemplateId: ctMpd.id,
    },
  });

  // プレート + ウェル
  const platesData = [
    {
      name: "Plate A-001",
      plateTypeId: pt96Sitting.id,
      status: PlateStatus.ACTIVE,
      notes: "Initial PEG screening plate",
      sampleName: "Lysozyme",
      reservoirTemplateId: ctPeg.id,
      screeningTemplateId: ctPeg.id,
      createdAt: new Date("2025-12-01"),
      rows: 8,
      cols: 12,
      filled: 48,
    },
    {
      name: "Plate B-024",
      plateTypeId: pt96Sitting.id,
      status: PlateStatus.ACTIVE,
      notes: "MPD optimization plate",
      sampleName: "Thaumatin",
      reservoirTemplateId: ctMpd.id,
      screeningTemplateId: ctMpd.id,
      createdAt: new Date("2025-11-20"),
      rows: 8,
      cols: 12,
      filled: 72,
    },
    {
      name: "Plate C-012",
      plateTypeId: pt24Hanging.id,
      status: PlateStatus.ACTIVE,
      sampleName: "Lysozyme",
      reservoirTemplateId: ctPeg.id,
      screeningTemplateId: ctPeg.id,
      createdAt: new Date("2025-12-05"),
      rows: 4,
      cols: 6,
      filled: 12,
    },
    {
      name: "Plate D-003",
      plateTypeId: pt96Sitting.id,
      status: PlateStatus.ARCHIVED,
      sampleName: "Catalase",
      reservoirTemplateId: ctMpd.id,
      screeningTemplateId: ctMpd.id,
      createdAt: new Date("2025-10-01"),
      rows: 8,
      cols: 12,
      filled: 96,
    },
    {
      name: "Plate E-007",
      plateTypeId: pt24Hanging.id,
      status: PlateStatus.ARCHIVED,
      sampleName: "Insulin",
      reservoirTemplateId: ctPeg.id,
      screeningTemplateId: ctPeg.id,
      createdAt: new Date("2025-11-01"),
      rows: 4,
      cols: 6,
      filled: 24,
    },
  ];

  for (const pd of platesData) {
    const { rows, cols, filled, ...plateFields } = pd;
    await prisma.plate.create({
      data: {
        ...plateFields,
        userId: user.id,
        wells: {
          create: generateWells(rows, cols, filled),
        },
      },
    });
  }

  console.log("Seed completed successfully!");
  console.log(`  - 1 user`);
  console.log(`  - 3 plate types`);
  console.log(
    `  - 2 condition templates (PEG: ${pegWells.length} wells, MPD: ${mpdWells.length} wells)`
  );
  console.log(`  - ${platesData.length} plates with wells`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

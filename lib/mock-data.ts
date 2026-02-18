import type {
  Plate,
  PlateType,
  ConditionTemplate,
  User,
  WellData,
  WellStatus,
} from "@/types";

export const plateTypes: PlateType[] = [
  {
    id: "96well-sitting",
    name: "96 Well - Sitting",
    wellCount: 96,
    description: "Standard 96-well sitting drop plate",
  },
  {
    id: "24well-hanging",
    name: "24 Well - Hanging",
    wellCount: 24,
    description: "24-well hanging drop plate",
  },
  {
    id: "sitting-manual",
    name: "Sitting Manual",
    wellCount: 96,
    description: "Manual sitting drop plate",
  },
];

export const conditionTemplates: ConditionTemplate[] = [
  {
    id: "pcr-assay",
    name: "PCR Assay",
    description: "Standard PCR amplification conditions",
  },
  {
    id: "elisa",
    name: "ELISA",
    description: "Enzyme-linked immunosorbent assay",
  },
  {
    id: "western-blot",
    name: "Western Blot",
    description: "Protein detection by western blotting",
  },
  {
    id: "cell-culture",
    name: "Cell Culture",
    description: "Standard cell culture conditions",
  },
];

function generateWells(
  rows: number,
  cols: number,
  filledCount: number
): WellData[] {
  const wells: WellData[] = [];
  const rowLabels = "ABCDEFGH";
  let filled = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const status: WellStatus = filled < filledCount ? "filled" : "empty";
      wells.push({
        position: `${rowLabels[r]}${c + 1}`,
        row: r,
        col: c,
        status,
        ...(status === "filled" && {
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

export const plates: Plate[] = [
  {
    id: "plate-a-001",
    name: "Plate A-001",
    plateType: plateTypes[0],
    status: "active",
    wells: generateWells(8, 12, 48),
    filledWells: 48,
    totalWells: 96,
    createdAt: "2025-12-01",
    updatedAt: "2025-12-15",
    notes: "Initial screening plate",
    conditionTemplate: "PCR Assay",
  },
  {
    id: "plate-b-024",
    name: "Plate B-024",
    plateType: plateTypes[0],
    status: "active",
    wells: generateWells(8, 12, 72),
    filledWells: 72,
    totalWells: 96,
    createdAt: "2025-11-20",
    updatedAt: "2025-12-10",
    notes: "Optimization plate",
    conditionTemplate: "ELISA",
  },
  {
    id: "plate-c-012",
    name: "Plate C-012",
    plateType: plateTypes[1],
    status: "active",
    wells: generateWells(4, 6, 12),
    filledWells: 12,
    totalWells: 24,
    createdAt: "2025-12-05",
    updatedAt: "2025-12-14",
    conditionTemplate: "Western Blot",
  },
  {
    id: "plate-d-003",
    name: "Plate D-003",
    plateType: plateTypes[0],
    status: "archived",
    wells: generateWells(8, 12, 96),
    filledWells: 96,
    totalWells: 96,
    createdAt: "2025-10-01",
    updatedAt: "2025-11-30",
    conditionTemplate: "PCR Assay",
  },
  {
    id: "plate-e-007",
    name: "Plate E-007",
    plateType: plateTypes[1],
    status: "completed",
    wells: generateWells(4, 6, 24),
    filledWells: 24,
    totalWells: 24,
    createdAt: "2025-11-01",
    updatedAt: "2025-12-01",
    conditionTemplate: "Cell Culture",
  },
];

export const currentUser: User = {
  name: "Tanaka Yuki",
  id: "user-001",
  email: "y.tanaka@lab.ac.jp",
  role: "Research Associate",
  organization: "Tokyo Institute of Technology",
  bio: "Specializing in protein crystallography and structural biology.",
};

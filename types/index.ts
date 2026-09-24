export type PlateType = {
  id: string;
  name: string;
  wellCount: number;
  rows: number;
  cols: number;
  maxDrops: number;
  layout: "SITTING" | "HANGING";
  description?: string;
};

export type WellStatus =
  "filled" | "empty" | "crystal" | "precipitate" | "clear";

export type WellData = {
  id?: string;
  position: string;
  row: number;
  col: number;
  status: WellStatus;
  protein?: string;
  concentration?: string;
  buffer?: string;
  ph?: string;
  precipitant?: string;
  notes?: string;
};

export type Plate = {
  id: string;
  name: string;
  plateType: PlateType;
  wells: WellData[];
  filledWells: number;
  totalWells: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  sampleName?: string;
  reservoirTemplate?: string;
  screeningTemplate?: string;
};

export type ConditionTemplate = {
  id: number;
  name: string;
  description: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  bio?: string;
};

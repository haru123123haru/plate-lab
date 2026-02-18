export type PlateTypeId = "96well-sitting" | "24well-hanging" | "sitting-manual";

export type PlateType = {
  id: PlateTypeId;
  name: string;
  wellCount: number;
  description?: string;
};

export type PlateStatus = "active" | "completed" | "archived";

export type WellStatus = "filled" | "empty" | "crystal" | "precipitate" | "clear";

export type WellData = {
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
  status: PlateStatus;
  wells: WellData[];
  filledWells: number;
  totalWells: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  conditionTemplate?: string;
};

export type ConditionTemplate = {
  id: string;
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

export type TabRoute = {
  label: string;
  href: string;
  icon: string;
};

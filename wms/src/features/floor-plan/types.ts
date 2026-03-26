export type FloorZone = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type FloorPlanData = {
  id: string;
  warehouseId: string;
  imageData: string | null;
  zones: FloorZone[];
};

export type TaskOnMap = {
  id: string;
  title: string;
  taskType: string;
  status: string;
  priority: number;
  assigneeType: string | null;
  assigneeName: string | null;
  workerProfileId: string | null;
  zoneName: string | null;
  locationCode: string | null;
  dueDate: string | null;
  createdAt: string;
};

export type ZoneWorkforce = {
  workerCount: number;
  percentage: number;
};

export type TaskLogEntry = {
  id: string;
  action: string;
  message: string;
  zoneName: string | null;
  createdAt: string;
};

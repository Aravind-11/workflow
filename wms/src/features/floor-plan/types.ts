export type FloorZone = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type FloorArrow = {
  id: string;
  fromZoneId: string;
  toZoneId: string;
  label?: string;
};

export type FloorPlanData = {
  id: string;
  warehouseId: string;
  imageData: string | null;
  zones: FloorZone[];
  arrows: FloorArrow[];
};

export type RouteTemplate = {
  id: string;
  name: string;
  zoneSequence: string[];
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
  routeTemplateId: string | null;
  expectedRoute: string[] | null;
  hasTicket: boolean;
};

export type TaskLogEntry = {
  id: string;
  action: string;
  message: string;
  zoneName: string | null;
  createdAt: string;
};

export type TaskTransition = {
  taskId: string;
  fromZone: string;
  toZone: string;
  progress: number;
};

export type WrongZoneAlert = {
  taskId: string;
  taskTitle: string;
  expectedZone: string;
  actualZone: string;
};

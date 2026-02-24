// Shared interfaces extracted from mockData

export interface Basin {
  id: string;
  code: number;
  name: string;
  level: number;
  parent_basin_id: string | null;
  geometry: { type: "Polygon"; coordinates: number[][][] };
  color: string;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  basin_id: string;
  lat: number;
  lon: number;
  type: "station" | "barrage" | "result_point";
  active: boolean;
}

export interface Dam {
  id: string;
  name: string;
  station_id: string; // links to station of type barrage
  basin_id: string;
  lat: number;
  lon: number;
  capacity: number;
  current_volume: number;
}

export interface Variable {
  code: string;
  label: string;
  unit: string;
  is_cumulative: boolean;
}

export interface Source {
  code: string;
  label: string;
  type: "observed" | "simulated";
  horizon?: string;
}

export interface Run {
  id: string;
  source_code: string;
  run_time: string;
  label: string;
  horizon: string;
  status: string;
}

export interface TimeseriesPoint {
  date: string;
  value: number;
}

export interface Alert {
  id: string;
  entity_type: "station" | "dam" | "basin";
  entity_id: string;
  entity_name: string;
  status: "safe" | "warning" | "critical";
  message: string;
  reason?: string;
}

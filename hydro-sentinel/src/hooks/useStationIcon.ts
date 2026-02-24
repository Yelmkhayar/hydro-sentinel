import { MapPin, Waves, CloudRain, Activity, HelpCircle } from 'lucide-react';

export type StationType = 'Station hydrologique' | 'Barrage' | 'point resultats' | 'Poste Pluviométrique' | string;

export interface StationIconConfig {
  Icon: React.ElementType;
  color: string;
  label: string;
}

export const stationIconColors: Record<string, string> = {
  'Station hydrologique': '#3b82f6', // blue-500
  'Barrage': '#8b5cf6',      // violet-500
  'Poste Pluviométrique': '#06b6d4', // cyan-500
  'point resultats': '#10b981', // emerald-500
  'default': '#6b7280'       // gray-500
};

export const stationIcons: Record<string, any> = {
  'Station hydrologique': Activity,
  'Barrage': Waves,
  'Poste Pluviométrique': CloudRain,
  'point resultats': MapPin,
  'default': HelpCircle
};

const STATION_ICON_MAP: Record<string, StationIconConfig> = {
  'Station hydrologique': {
    Icon: stationIcons['Station hydrologique'],
    color: stationIconColors['Station hydrologique'],
    label: 'Station hydrologique',
  },
  'Barrage': {
    Icon: stationIcons['Barrage'],
    color: stationIconColors['Barrage'],
    label: 'Barrage',
  },
  'point resultats': {
    Icon: stationIcons['point resultats'],
    color: stationIconColors['point resultats'],
    label: 'Poste de résultats',
  },
  'Poste Pluviométrique': {
    Icon: stationIcons['Poste Pluviométrique'],
    color: stationIconColors['Poste Pluviométrique'],
    label: 'Poste Pluviométrique',
  },
};

const DEFAULT_ICON_CONFIG: StationIconConfig = {
  Icon: HelpCircle,
  color: '#6b7280', // gray-500
  label: 'Unknown',
};

export function useStationIcon(stationType: StationType): StationIconConfig {
  return STATION_ICON_MAP[stationType] || DEFAULT_ICON_CONFIG;
}

export function getStationIconConfig(stationType: StationType): StationIconConfig {
  return STATION_ICON_MAP[stationType] || DEFAULT_ICON_CONFIG;
}

// Get all available station types with their icon configurations
export function getAllStationTypes(): Array<{ type: string; config: StationIconConfig }> {
  return Object.entries(STATION_ICON_MAP).map(([type, config]) => ({
    type,
    config,
  }));
}

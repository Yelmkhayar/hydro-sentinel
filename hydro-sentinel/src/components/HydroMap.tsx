import React, { useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../lib/api';
import { useDashboardStore } from '../store/dashboardStore';

interface MapPoint {
  station_id: string;
  station_name: string;
  station_type: 'Barrage' | 'Poste Pluviométrique' | 'Station hydrologique' | 'point resultats';
  lat: number;
  lon: number;
  severity: 'safe' | 'warning' | 'critical' | 'OK' | 'ALERTE_LACHER';
  score: number;
  precip_obs_mm: number | null;
  precip_cum_24h_mm: number | null;
  debit_obs_m3s: number | null;
  debit_sim_m3s: number | null;
  volume_hm3_latest: number | null;
  volume_sim_hm3: number | null;
}

const severityColors = {
  safe: '#10b981',    // green-500
  warning: '#f59e0b', // amber-500
  critical: '#ef4444' // red-500
};

export function HydroMap({ filterType = 'all' }: { filterType?: 'all' | 'Barrage' | 'Poste Pluviométrique' | 'Station hydrologique' | 'point resultats' }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { selectedBasinId, setSelectedBasinId, mapDisplayMode, setMapDisplayMode } = useDashboardStore();
  const [points, setPoints] = React.useState<MapPoint[]>([]);
  const [basins, setBasins] = React.useState<any[]>([]);
  const [sourceMode, setSourceMode] = React.useState<'OBS' | 'SIM'>('OBS');

  // Fetch points & basins
  useEffect(() => {
    // Fetch KPI points
    api.get<MapPoint[]>('/map/points-kpi')
      .then(res => {
        console.log("🗺️ fetched map points:", res.data.length);
        setPoints(res.data);
      })
      .catch(err => console.error("Failed to load map points", err));
      
    // Fetch Basins
    api.get<any[]>('/basins')
      .then(res => {
        console.log("🌲 fetched basins:", res.data.length);
        setBasins(res.data);
      })
      .catch(err => console.error("Failed to load basins", err));
  }, []);

  const pointGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: points
      .filter(p => p.lon !== null && p.lat !== null && p.lon !== undefined && p.lat !== undefined)
      .filter(p => filterType === 'all' || p.station_type === filterType)
      .map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: {
          ...p,
          displayMode: mapDisplayMode,
          // Computed dynamic properties based on source mode
          debit_val: sourceMode === 'SIM' ? p.debit_sim_m3s : p.debit_obs_m3s,
          volume_val: sourceMode === 'SIM' ? p.volume_sim_hm3 : p.volume_hm3_latest,
          // Pre-calculate display checks to simplify expression
          hasPrecip: p.precip_obs_mm !== null && p.precip_obs_mm !== undefined,
          hasDebit: sourceMode === 'SIM' ? (p.debit_sim_m3s !== null && p.debit_sim_m3s !== undefined) : (p.debit_obs_m3s !== null && p.debit_obs_m3s !== undefined),
          hasVolume: sourceMode === 'SIM' ? (p.volume_sim_hm3 !== null && p.volume_sim_hm3 !== undefined) : (p.volume_hm3_latest !== null && p.volume_hm3_latest !== undefined)
        }
      }))
  }), [points, mapDisplayMode, filterType, sourceMode]);

  const basinGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: basins
      .filter(b => b.geometry !== null && b.geometry !== undefined)
      .map(b => ({
        type: 'Feature',
        geometry: b.geometry,
        properties: {
          id: b.id,
          name: b.name,
          code: b.code,
          level: b.level
        }
      }))
  }), [basins]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
      center: [-5.0, 34.0], // Centered on Sebou
      zoom: 7
    });

    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addSource('basins', {
        type: 'geojson',
        data: basinGeoJson as any
      });

      map.current.addSource('stations', {
        type: 'geojson',
        data: pointGeoJson as any
      });

      // Basin Fill Layer
      map.current.addLayer({
        id: 'basins-fill',
        type: 'fill',
        source: 'basins',
        paint: {
          'fill-color': '#0369a1', // sky-700
          'fill-opacity': 0.15
        }
      });

      // Basin Outline Layer
      map.current.addLayer({
        id: 'basins-outline',
        type: 'line',
        source: 'basins',
        paint: {
          'line-color': '#0ea5e9', // sky-500
          'line-width': 1.5
        }
      });

      map.current.addLayer({
        id: 'stations-circle',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, [
              'match',
              ['get', 'station_type'],
              'Barrage', 9,
              'Station hydrologique', 6,
              'Poste Pluviométrique', 6,
              'point resultats', 6,
              5
            ],
            12, [
              'match',
              ['get', 'station_type'],
              'Barrage', 18,
              'Station hydrologique', 12,
              'Poste Pluviométrique', 12,
              'point resultats', 12,
              10
            ]
          ],
          'circle-color': [
            'case',
            // --- Precip Mode ---
            ['==', ['get', 'displayMode'], 'precip'],
            ['case',
                ['==', ['get', 'precip_obs_mm'], null], '#9ca3af', // Gray if null
                ['==', ['get', 'precip_obs_mm'], 0], '#e0f2fe', // Very light blue for 0
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'precip_obs_mm'],
                  0.1, '#bae6fd',
                  5, '#3b82f6',
                  20, '#1d4ed8',
                  50, '#4c1d95',
                  100, '#be185d' // Pink/Red for extreme
                ]
            ],
            // --- Debit Mode ---
            ['==', ['get', 'displayMode'], 'debit'],
            ['case',
                ['==', ['get', 'debit_val'], null], '#9ca3af',
                ['==', ['get', 'debit_val'], 0], '#d1fae5', 
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'debit_val'],
                  0.1, '#6ee7b7',
                  10, '#10b981',
                  50, '#059669',
                  100, '#047857',
                  500, '#022c22'
                ]
            ],
            // --- Volume Mode ---
            ['==', ['get', 'displayMode'], 'volume'],
             ['case',
                ['==', ['get', 'volume_val'], null], '#9ca3af',
                ['==', ['get', 'volume_val'], 0], '#ffedd5',
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'volume_val'],
                  10, '#fdba74',
                  100, '#f97316',
                  500, '#c2410c',
                  1000, '#7c2d12'
                ]
            ],
            // --- Default / Severity Mode ---
            ['==', ['get', 'displayMode'], 'severity'],
            [
              'match',
              ['get', 'station_type'],
              'Station hydrologique', '#3b82f6', // blue-500
              'Barrage', '#8b5cf6',      // violet-500
              'Poste Pluviométrique', '#06B6D4', // cyan
              'point resultats', '#10b981', // emerald-500
              '#6b7280' // gray-500 default
            ],
            // Fallback for logic errors
            [
              'match',
              ['get', 'severity'],
              'OK', severityColors.safe,
              'safe', severityColors.safe,
              'warning', severityColors.warning,
              'critical', severityColors.critical,
              'ALERTE_LACHER', severityColors.critical,
              '#9ca3af' // default gray
            ]
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': [
            'match',
            ['get', 'severity'],
            'critical', '#ffffff',
            'ALERTE_LACHER', '#ffffff',
            'warning', '#ffffff',
            '#ffffff'
          ]
        }
      });

      // Cursor pointer
      map.current.on('mouseenter', 'stations-circle', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'stations-circle', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

      // Click Popup
      map.current.on('click', 'stations-circle', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties as MapPoint;
        const isDam = props.station_type === 'Barrage';
        const dynamicProps = feature.properties as any;

        // Update global selection
        useDashboardStore.getState().setSelectedBasinId(props.station_id);

        const coordinates = (feature.geometry as any).coordinates.slice();

        new maplibregl.Popup()
          .setLngLat(coordinates as [number, number])
          .setHTML(`
            <div class="p-3 min-w-[220px]">
              <h3 class="font-bold text-base mb-1">${props.station_name}</h3>
              <div class="text-[10px] text-muted-foreground uppercase mb-3 tracking-wider font-semibold border-b pb-1">
                ${props.station_type?.replace('_', ' ')}
              </div>
              
              <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center">
                    <span class="text-muted-foreground">Pluie 24h:</span>
                    <span class="font-medium ${!props.precip_cum_24h_mm ? 'text-gray-400' : ''}">
                        ${props.precip_cum_24h_mm?.toFixed(1) || '--'} mm
                    </span>
                </div>
                
                <div class="flex justify-between items-center">
                    <span class="text-muted-foreground">Débit:</span>
                    <span class="font-medium ${dynamicProps.debit_val === null ? 'text-gray-400' : ''}">
                        ${dynamicProps.debit_val != null ? Number(dynamicProps.debit_val).toFixed(2) : '--'} m³/s
                    </span>
                </div>

                ${isDam ? `
                    <div class="flex justify-between items-center">
                        <span class="text-muted-foreground">Volume:</span>
                        <span class="font-medium ${dynamicProps.volume_val === null ? 'text-gray-400' : ''}">
                            ${dynamicProps.volume_val != null ? Number(dynamicProps.volume_val).toFixed(2) : '--'} hm³
                        </span>
                    </div>
                ` : ''}
                
                <div class="pt-2 mt-2 border-t text-[10px] text-center text-muted-foreground italic">
                    Cliquez pour voir le graphique
                </div>
              </div>
            </div>
          `)
          .addTo(map.current!);
      });
    });
  }, []);

  // Update source data when points change or mode changes
  useEffect(() => {
    if (map.current && map.current.getSource('stations')) {
      (map.current.getSource('stations') as maplibregl.GeoJSONSource).setData(pointGeoJson as any);
    }
  }, [pointGeoJson]);

  useEffect(() => {
    if (map.current && map.current.getSource('basins')) {
      (map.current.getSource('basins') as maplibregl.GeoJSONSource).setData(basinGeoJson as any);
    }
  }, [basinGeoJson]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Control - Top Right */}
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm p-2 rounded-md shadow-md border z-10 w-36">
        <div className="text-xs font-semibold mb-2 px-1">Données</div>
        <div className="flex gap-1 mb-3 bg-muted/30 p-1 rounded-md">
          <button 
            onClick={() => setSourceMode('OBS')}
            className={`flex-1 text-[10px] py-1 rounded transition-colors ${sourceMode === 'OBS' ? 'bg-background shadow-sm border font-bold text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Observé
          </button>
          <button 
            onClick={() => setSourceMode('SIM')}
            className={`flex-1 text-[10px] py-1 rounded transition-colors ${sourceMode === 'SIM' ? 'bg-background shadow-sm border font-bold text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Simulé
          </button>
        </div>

        <div className="text-xs font-semibold mb-2 px-1">Affichage</div>
        <div className="flex flex-col gap-1">
          {[
            { id: 'severity', label: 'Vigilance' },
            { id: 'precip', label: 'Précipitations' },
            { id: 'debit', label: 'Débits' },
            { id: 'volume', label: 'Volume' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setMapDisplayMode(mode.id as any)}
              className={`text-xs px-2 py-1 rounded text-left transition-colors ${
                mapDisplayMode === mode.id 
                  ? 'bg-primary text-primary-foreground font-medium' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        
        {/* Simple Legend */}
        <div className="mt-3 pt-2 border-t px-1">
          <div className="text-[10px] text-muted-foreground mb-1">Légende</div>
          <div className="flex flex-col gap-1 text-[10px]">
            {mapDisplayMode === 'severity' && (
              <>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
                        <span className="text-xs">Barrage</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                        <span className="text-xs">Station Hydrologique</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#06B6D4]"></div>
                        <span className="text-xs">Poste Pluviométrique</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                        <span className="text-xs">Point Résultats</span>
                    </div>
                </div>
              </>
            )}
            {mapDisplayMode === 'precip' && (
               <div className="w-full h-2 rounded bg-gradient-to-r from-blue-100 via-blue-500 to-indigo-900"></div>
            )}
            {mapDisplayMode === 'debit' && (
               <div className="w-full h-2 rounded bg-gradient-to-r from-emerald-100 via-emerald-500 to-emerald-900"></div>
            )}
            {mapDisplayMode === 'volume' && (
               <div className="w-full h-2 rounded bg-gradient-to-r from-orange-100 via-orange-500 to-orange-900"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

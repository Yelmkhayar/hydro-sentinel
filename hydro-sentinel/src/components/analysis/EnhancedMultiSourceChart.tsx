import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { api } from '@/lib/api';
import { Loader2, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

export interface EnhancedMultiSourceChartProps {
  stationId: string;
  variableCode: string;
  variableLabel: string;
  unit: string;
  sources: string[];
  startDate?: string;
  endDate?: string;
  chartType?: 'line' | 'bar';
  entityType?: 'stations' | 'bassins';
  onDataLoaded?: (data: TimeseriesData[]) => void;
}

interface TimeseriesData {
  time: string;
  displayTime: string;
  [key: string]: number | string;
}

const SOURCE_COLORS: Record<string, string> = {
  OBS: '#3b82f6',
  AROME: '#f59e0b',
  ECMWF: '#10b981',
  HEC_HMS: '#8b5cf6',
  SIM: '#8b5cf6',   // Purple (Same as HEC_HMS, or maybe darker?)
  ABHS_RES: '#ec4899',
};

export function EnhancedMultiSourceChart({
  stationId,
  variableCode,
  variableLabel,
  unit,
  sources,
  startDate,
  endDate,
  chartType = 'line',
  entityType = 'stations',
  onDataLoaded,
}: EnhancedMultiSourceChartProps) {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<TimeseriesData[]>([]);
  const [logScale, setLogScale] = useState(false);
  const [enableBrush, setEnableBrush] = useState(false);
  const [customPeriod, setCustomPeriod] = useState<{ start?: Date; end?: Date }>({});
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);

  const effectiveStartDate = customPeriod.start
    ? customPeriod.start.toISOString()
    : startDate;
  const effectiveEndDate = customPeriod.end
    ? customPeriod.end.toISOString()
    : endDate;

  useEffect(() => {
    if (!stationId || !variableCode || sources.length === 0) {
      setChartData([]);
      return;
    }

    console.log('[Chart] Fetching data for:', { stationId, variableCode, sources });

    const fetchData = async () => {
      setLoading(true);
      const timeMap = new Map<string, TimeseriesData>();

      try {
        for (const source of sources) {
          const params: any = {
            station_id: stationId,
            variable_code: variableCode,
            source_code: source,
            entity_type: entityType,
          };

          if (effectiveStartDate) params.start = effectiveStartDate;
          if (effectiveEndDate) params.end = effectiveEndDate;

          try {
            const response = await api.get('/measurements/timeseries', { params });

            if (response.data && Array.isArray(response.data)) {
              response.data.forEach((point: any) => {
                const isoTime = point.time; 
                if (!isoTime) return;

                if (!timeMap.has(isoTime)) {
                   try {
                     const dateObj = new Date(isoTime);
                     if (isNaN(dateObj.getTime())) return; // Skip invalid dates

                     const displayTime = dateObj.toLocaleString('fr-FR', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    timeMap.set(isoTime, { time: isoTime, displayTime });
                   } catch (e) {
                     console.error("Invalid date:", isoTime, e);
                     return;
                   }
                }
                const existing = timeMap.get(isoTime)!;
                if (existing) {
                    existing[source] = point.value;
                }
              });
            }
          } catch (error) {
            console.error(`Failed to fetch ${source}:`, error);
          }
        }

        const merged = Array.from(timeMap.values());
        merged.sort((a, b) => {
          return new Date(a.time).getTime() - new Date(b.time).getTime();
        });

        setChartData(merged);
        
        if (onDataLoaded) {
          onDataLoaded(merged);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, variableCode, sources.join(','), effectiveStartDate, effectiveEndDate, entityType]);

  const handlePeriodApply = () => {
    setShowPeriodPicker(false);
  };

  const handlePeriodReset = () => {
    setCustomPeriod({});
    setShowPeriodPicker(false);
  };

  const ChartComponent = chartType === 'bar' ? BarChart : LineChart;

  const processedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    return chartData.map(point => {
      const newPoint: any = { ...point };
      
      sources.forEach(source => {
        let val = point[source];
        
        // Handle Log Scale: 0 or negative values are invalid
        if (logScale && (typeof val === 'number' && val <= 0)) {
            val = null; // Hide 0 values in log scale
        }

        // Logic for Series Naming/Mapping
        // We no longer split by time for everything. We map specific sources to specific roles.
        // OBS -> "Obs"
        // AROME/ECMWF/SIM -> "Prev {Source}"
        
        // However, to keep it generic, we can just use the source name as key, 
        // but we will customize the Legend Label in the render loop.
        
        newPoint[source] = val;
      });
      return newPoint;
    });
  }, [chartData, sources, logScale]);

  const getSourceConfig = (source: string) => {
      const color = SOURCE_COLORS[source] || '#6b7280';
      let name = source;
      let strokeDasharray = undefined;

      if (source === 'OBS') {
          name = 'Obs';
      } else if (['AROME', 'ECMWF', 'SIM'].includes(source)) {
          name = `Prev ${source}`;
          // strokeDasharray = "5 5"; // Optional: make forecasts dashed if desired, user asked for "courbe"
      }

      return { color, name, strokeDasharray };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground border rounded-lg bg-muted/20">
        Aucune donnée disponible pour cette sélection
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Chart Controls */}
      <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-3">
          {/* Log Scale Toggle */}
          <Label className="flex items-center gap-2 cursor-pointer text-xs">
            <Checkbox checked={logScale} onCheckedChange={(checked) => setLogScale(!!checked)} />
            <TrendingUp className="h-3 w-3" />
            <span>Échelle log</span>
          </Label>

          {/* Brush Toggle */}
          <Label className="flex items-center gap-2 cursor-pointer text-xs">
            <Checkbox checked={enableBrush} onCheckedChange={(checked) => setEnableBrush(!!checked)} />
            <span>Zoom interactif</span>
          </Label>
        </div>

        {/* Custom Period */}
        <Popover open={showPeriodPicker} onOpenChange={setShowPeriodPicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Calendar className="h-3 w-3" />
              {customPeriod.start || customPeriod.end
                ? `${customPeriod.start ? format(customPeriod.start, 'dd/MM') : '...'} - ${customPeriod.end ? format(customPeriod.end, 'dd/MM') : '...'}`
                : 'Période personnalisée'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="end">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Date de début</Label>
                <CalendarComponent
                  mode="single"
                  selected={customPeriod.start}
                  onSelect={(date) => setCustomPeriod((prev) => ({ ...prev, start: date }))}
                  className="rounded-md border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Date de fin</Label>
                <CalendarComponent
                  mode="single"
                  selected={customPeriod.end}
                  onSelect={(date) => setCustomPeriod((prev) => ({ ...prev, end: date }))}
                  className="rounded-md border"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePeriodApply} className="flex-1 text-xs">
                  Appliquer
                </Button>
                <Button size="sm" variant="outline" onClick={handlePeriodReset} className="flex-1 text-xs">
                  Réinitialiser
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={processedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="displayTime" tick={{ fontSize: 11 }} stroke="#6b7280" />
          <YAxis
            scale={logScale ? 'log' : 'auto'}
            domain={logScale ? ['auto', 'auto'] : undefined}
            tick={{ fontSize: 11 }}
            stroke="#6b7280"
            label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {sources.map((source, index) => {
              const { color, name, strokeDasharray } = getSourceConfig(source);
              
              if (chartType === 'bar') {
                  return (
                    <Bar
                      key={source}
                      dataKey={source}
                      name={name}
                      fill={color}
                      opacity={0.8}
                    />
                  );
              }
              return (
                <Line
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stroke={color}
                  name={name}
                  dot={false}
                  strokeWidth={2}
                  strokeDasharray={strokeDasharray}
                  connectNulls={true} // Changed to true to connect lines over missing data if desired, or false.
                />
              );
          })}
          {enableBrush && <Brush dataKey="displayTime" height={30} stroke="#3b82f6" />}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

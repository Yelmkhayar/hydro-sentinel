import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface VariableSelection {
  variableCode: string;
  sourceCodes: string[];
}

export interface MultiSourceChartProps {
  stationId: string;
  selections: VariableSelection[];
  mode: 'overlay' | 'continuous';
  startDate?: string;
  endDate?: string;
}

interface TimeseriesData {
  time: string;
  [key: string]: number | string;
}

const SOURCE_COLORS: Record<string, string> = {
  OBS: '#3b82f6',
  AROME: '#8b5cf6',
  ECMWF: '#ec4899',
  SIMULE: '#f59e0b',
  ABHS_RES: '#10b981',
};

const VARIABLE_LABELS: Record<string, string> = {
  precip_mm: 'Précipitations (mm)',
  debit_m3s: 'Débit (m³/s)',
  volume_mm3: 'Volume (Mm³)',
  apport_mm3: 'Apports (Mm³)',
  apport_journalier_mm3: 'Apports journaliers (Mm³)',
};

export function MultiSourceChart({
  stationId,
  selections,
  mode,
  startDate,
  endDate,
}: MultiSourceChartProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, TimeseriesData[]>>({});

  useEffect(() => {
    if (!stationId || selections.length === 0) return;

    const fetchData = async () => {
      setLoading(true);
      const newData: Record<string, TimeseriesData[]> = {};

      try {
        for (const selection of selections) {
          for (const sourceCode of selection.sourceCodes) {
            const key = `${selection.variableCode}_${sourceCode}`;
            
            const params: any = {
              station_id: stationId,
              variable_code: selection.variableCode,
              source_code: sourceCode,
            };

            if (startDate) params.start = startDate;
            if (endDate) params.end = endDate;

            try {
              const response = await api.get('/measurements/timeseries', { params });
              
              if (response.data && Array.isArray(response.data)) {
                newData[key] = response.data.map((point: any) => ({
                  time: new Date(point.time).toLocaleString('fr-FR'),
                  [key]: point.value,
                }));
              }
            } catch (error) {
              console.error(`Failed to fetch ${key}:`, error);
            }
          }
        }

        setData(newData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [stationId, selections, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (Object.keys(data).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Aucune donnée disponible
      </div>
    );
  }

  if (mode === 'overlay') {
    // Merge all data into a single dataset
    const mergedData: TimeseriesData[] = [];
    const timeMap = new Map<string, TimeseriesData>();

    Object.entries(data).forEach(([key, points]) => {
      points.forEach((point) => {
        if (!timeMap.has(point.time)) {
          timeMap.set(point.time, { time: point.time });
        }
        const existing = timeMap.get(point.time)!;
        existing[key] = point[key];
      });
    });

    mergedData.push(...Array.from(timeMap.values()));
    mergedData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={mergedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          {Object.keys(data).map((key) => {
            const [variableCode, sourceCode] = key.split('_');
            const color = SOURCE_COLORS[sourceCode] || '#6b7280';
            const label = `${VARIABLE_LABELS[variableCode] || variableCode} (${sourceCode})`;
            
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                name={label}
                dot={false}
                strokeWidth={2}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Continuous mode: separate charts
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, points]) => {
        const [variableCode, sourceCode] = key.split('_');
        const color = SOURCE_COLORS[sourceCode] || '#6b7280';
        const label = `${VARIABLE_LABELS[variableCode] || variableCode} (${sourceCode})`;

        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import { Loader2 } from 'lucide-react';

interface TimePoint {
  time: string;
  value: number;
  variable_code: string;
  source_code: string;
}

interface HydroGraphProps {
  stationId: string;
  variables: string[];
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
];

export function HydroGraph({ stationId, variables }: HydroGraphProps) {
  const [data, setData] = useState<TimePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId || variables.length === 0) {
      setData([]);
      return;
    }
    
    setLoading(true);
    setError(null);

    // Fetch data for multiple variables
    api.get<TimePoint[]>('/timeseries', {
      params: { 
        station_id: stationId,
        variables: variables.join(',')
      }
    })
    .then(res => {
      setData(res.data);
      setLoading(false);
    })
    .catch(err => {
      console.error("Failed to fetch timeseries", err);
      setError(err.response?.data?.detail || "Erreur lors du chargement des données");
      setLoading(false);
    });
  }, [stationId, variables]);

  // Pivot data for Recharts: { time: '...', precip_mm_OBS: 12, precip_mm_AROME: 14, ... }
  const chartData = useMemo(() => {
    const pivot: Record<string, any> = {};
    
    data.forEach(d => {
      const t = d.time;
      const key = `${d.variable_code}_${d.source_code}`;
      
      if (!pivot[t]) {
        pivot[t] = { 
          time: new Date(t).toLocaleDateString('fr-FR', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      }
      pivot[t][key] = d.value;
    });
    
    return Object.values(pivot).sort((a: any, b: any) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  }, [data]);

  // Generate line configurations for each variable-source combination
  const lines = useMemo(() => {
    const uniqueKeys = new Set<string>();
    data.forEach(d => {
      uniqueKeys.add(`${d.variable_code}_${d.source_code}`);
    });
    
    return Array.from(uniqueKeys).map((key, index) => {
      const [varCode, sourceCode] = key.split('_');
      const color = COLORS[index % COLORS.length];
      const isDashed = sourceCode !== 'OBS';
      
      return {
        key,
        label: `${varCode} (${sourceCode})`,
        color,
        strokeDasharray: isDashed ? "5 5" : undefined
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Aucune donnée disponible pour cette station
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="time" 
            tick={{fontSize: 10}} 
            minTickGap={30}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{fontSize: 10}} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
            }}
            labelStyle={{ color: '#6b7280', marginBottom: '0.25rem' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          
          {lines.map(line => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              strokeDasharray={line.strokeDasharray}
              dot={false}
              activeDot={{ r: 4 }}
              name={line.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

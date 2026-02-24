import { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { Loader2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpandedChartDialog } from './ExpandedChartDialog';

export interface CompactVariableSelection {
  variableCode: string;
  sourceCode: string;
  label: string;
  color: string;
}

export interface UnifiedChartProps {
  stationId: string;
  selections: CompactVariableSelection[];
  startDate?: string;
  endDate?: string;
  stationName?: string; // Added for dialog title
}

interface TimeseriesData {
  time: string; // ISO String for internal use
  displayTime: string; // Formatted for XAxis
  [key: string]: number | string;
}

export function UnifiedChart({
  stationId,
  selections,
  startDate,
  endDate,
  stationName,
}: UnifiedChartProps) {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<TimeseriesData[]>([]);
  const [showExpand, setShowExpand] = useState(false);

  // Identify if we are inside the Expanded Dialog to avoid recursion (simple check: if stationName is passed, we might be inside, or we can use a prop)
  // Actually, we can just check if the parent passed a way to expand.
  // But since we reuse this component inside the dialog, we should probably hide the expand button inside the dialog. 
  // Let's rely on context or a prop 'isExpanded' if needed, but for now allow expanding from anywhere unless restricted.
  
  useEffect(() => {
    if (!stationId || selections.length === 0) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const timeMap = new Map<string, TimeseriesData>();

      try {
        for (const selection of selections) {
          const key = `${selection.variableCode}_${selection.sourceCode}`;
          
          const params: any = {
            station_id: stationId,
            variable_code: selection.variableCode,
            source_code: selection.sourceCode,
          };

          if (startDate) params.start = startDate;
          if (endDate) params.end = endDate;

          try {
            const response = await api.get('/measurements/timeseries', { params });
            
            if (response.data && Array.isArray(response.data)) {
              response.data.forEach((point: any) => {
                // Use ISO string as key to ensure uniqueness and correct sorting
                const isoTime = point.time;
                
                if (!timeMap.has(isoTime)) {
                   const dateObj = new Date(isoTime);
                   const displayTime = dateObj.toLocaleString('fr-FR', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  timeMap.set(isoTime, { time: isoTime, displayTime });
                }
                const existing = timeMap.get(isoTime)!;
                existing[key] = point.value;
              });
            }
          } catch (error) {
            console.error(`Failed to fetch ${key}:`, error);
          }
        }

        const merged = Array.from(timeMap.values());
        // Sort by ISO time string (lexicographically correct for ISO) or timestamps
        merged.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        setChartData(merged);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [stationId, selections, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground border rounded-lg bg-muted/20">
        {selections.length === 0 
          ? 'Sélectionnez une variable pour afficher le graphique'
          : 'Aucune donnée disponible pour cette sélection'
        }
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[300px] flex flex-col">
       <div className="absolute top-0 right-0 z-10 p-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowExpand(true)}>
                <Maximize2 className="h-4 w-4" />
            </Button>
       </div>
       
       <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
            dataKey="displayTime" 
            tick={{ fontSize: 11 }}
            stroke="#6b7280"
            />
            <YAxis 
            tick={{ fontSize: 11 }}
            stroke="#6b7280"
            />
            <Tooltip 
            contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px',
            }}
            />
            <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            />
            {selections.map((selection, index) => {
            const key = `${selection.variableCode}_${selection.sourceCode}`;
            const strokeWidth = index === 0 ? 3 : 2;
            const opacity = index === 0 ? 1 : 0.8;
            
            return (
                <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={selection.color}
                name={selection.label}
                dot={false}
                strokeWidth={strokeWidth}
                opacity={opacity}
                connectNulls
                />
            );
            })}
        </LineChart>
        </ResponsiveContainer>

        <ExpandedChartDialog 
            open={showExpand} 
            onOpenChange={setShowExpand} 
            stationId={stationId}
            stationName={stationName}
            selections={selections}
        />
    </div>
  );
}

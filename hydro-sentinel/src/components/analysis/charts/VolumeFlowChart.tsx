import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface VolumeFlowChartProps {
  data: any[];
  title?: string;
  variableName?: string;
  unit?: string;
}

export function VolumeFlowChart({ data, title = "Débit Horaire", variableName = "Débit", unit = "m3/s" }: VolumeFlowChartProps) {
  const [logScale, setLogScale] = useState(false);
  const [enableBrush, setEnableBrush] = useState(true);

  return (
    <Card className="w-full h-[500px] flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold uppercase text-gray-700">
            {title}
        </CardTitle>
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <Checkbox id="log-scale" checked={logScale} onCheckedChange={(c) => setLogScale(!!c)} />
                <Label htmlFor="log-scale" className="text-sm cursor-pointer">Échelle Log</Label>
            </div>
             <div className="flex items-center gap-2">
                <Checkbox id="brush" checked={enableBrush} onCheckedChange={(c) => setEnableBrush(!!c)} />
                <Label htmlFor="brush" className="text-sm cursor-pointer">Zoom</Label>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
                <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => {
                         try {
                            const date = new Date(d);
                            return isNaN(date.getTime()) ? d : format(date, "ddMMM yyyy HH:mm", { locale: fr });
                        } catch (e) {
                            return d;
                        }
                    }}
                    angle={-90}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 10 }}
                />
                <YAxis 
                    scale={logScale ? 'log' : 'auto'}
                    domain={logScale ? ['auto', 'auto'] : ['auto', 'auto']}
                    label={{ value: unit, angle: -90, position: "insideLeft", style: { fontWeight: 'bold' } }}
                />

                <Tooltip 
                    labelFormatter={(d) => {
                        try {
                            const date = new Date(d);
                            return isNaN(date.getTime()) ? d : format(date, "dd MMMM yyyy HH:mm", { locale: fr });
                        } catch (e) {
                            return d;
                        }
                    }}
                    contentStyle={{ border: '1px solid #ccc', borderRadius: '4px' }}
                />
                
                <Legend verticalAlign="top" height={36} />

                <Line
                    type="monotone"
                    dataKey="value"
                    name={variableName}
                    stroke="#3b82f6" // Blue
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                />

                {enableBrush && <Brush dataKey="date" height={30} stroke="#3b82f6" alwaysShowText={false} />}

            </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

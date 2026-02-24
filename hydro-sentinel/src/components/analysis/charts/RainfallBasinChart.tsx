import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RainfallBasinChartProps {
  data: any[];
  title?: string;
}

export function RainfallBasinChart({ data, title = "PLUIE SUR LES BASSINS" }: RainfallBasinChartProps) {
  if (!data || data.length === 0) {
      return (
        <Card className="w-full h-[500px] flex items-center justify-center">
            <p className="text-muted-foreground">Pas de données disponibles pour le graphique</p>
        </Card>
      );
  }

  return (
    <Card className="w-full h-[500px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-xl font-bold uppercase text-gray-700">
            {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={true} />
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
                    label={{ value: "Volume Mm3", angle: -90, position: "insideLeft", style: { fontWeight: 'bold' } }}
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
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ border: '1px solid #ccc', borderRadius: '4px' }}
                />
                
                <Legend verticalAlign="bottom" height={36} />

                {/* Group 1: Basin Upstream */}
                <Bar 
                    dataKey="precip_amont" 
                    name="Pluie journalière sur Bassin Amont" 
                    fill="#5b8db8" // Muted Blue
                    barSize={15}
                >
                    <LabelList dataKey="precip_amont" position="top" style={{ fontSize: 10, fill: '#374151', fontWeight: 'bold' }} />
                </Bar>

                {/* Group 2: Basin Downstream */}
                <Bar 
                    dataKey="precip_aval" 
                    name="Pluie journalière sur Bassin Aval" 
                    fill="#93c5fd" // Light Blue
                    barSize={15}
                >
                    <LabelList dataKey="precip_aval" position="top" style={{ fontSize: 10, fill: '#374151' }} />
                </Bar>

            </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

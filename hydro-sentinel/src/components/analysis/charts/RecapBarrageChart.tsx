import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RecapBarrageChartProps {
  data: any[];
  damName: string;
  vn?: number; // Volume Normal
  hn?: number; // Hauteur Normale
}

export function RecapBarrageChart({ data, damName, vn = 3522.2, hn = 166 }: RecapBarrageChartProps) {
  return (
    <Card className="w-full h-[500px] flex flex-col">
      <CardHeader className="pb-2 relative">
        <CardTitle className="text-center text-xl font-bold uppercase text-gray-700">
            RÉCAP BARRAGE {damName}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <defs>
                    <pattern id="stripePattern" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
                        <rect width="2" height="4" fill="#6b7280" />
                        <rect width="2" height="4" fill="transparent" transform="translate(2,0)" />
                    </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
                <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => {
                         try {
                            const date = new Date(d);
                            return isNaN(date.getTime()) ? d : format(date, "dd MMM yyyy", { locale: fr });
                        } catch (e) {
                            return d;
                        }
                    }}
                    angle={-90}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 10 }}
                />
                {/* Left Y-Axis: Volume (Mm3) */}
                <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    label={{ value: "Volume (Mm³)", angle: -90, position: "insideLeft", offset: -5, style: { fontWeight: 'bold' } }}
                />

                <Tooltip 
                    labelFormatter={(d) => {
                        try {
                            const date = new Date(d);
                            return isNaN(date.getTime()) ? d : format(date, "dd MMMM yyyy", { locale: fr });
                        } catch (e) {
                            return d;
                        }
                    }}
                    contentStyle={{ border: '1px solid #ccc', borderRadius: '4px' }}
                />
                
                <Legend verticalAlign="bottom" height={36} />


                {/* Right Y-Axis: Flow (m3/s) */}
                <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    label={{ value: "Débit (m³/s)", angle: 90, position: "insideRight", offset: 0, style: { fontWeight: 'bold' } }}
                />

                {/* Bar: Release (m3/s) -> Right Axis (Grey Striped) */}
                <Bar
                    yAxisId="right"
                    dataKey="lacher_m3s"
                    name="Débit de lâcher (m³/s)"
                    fill="url(#stripePattern)"
                    barSize={16}
                    opacity={1}
                >
                     <LabelList dataKey="lacher_m3s" position="top" formatter={(v: any) => v ? Number(v).toFixed(1) : ''} style={{ fontSize: 10, fill: '#4b5563', fontWeight: 'bold' }} />
                </Bar>

                {/* Line: Apport (m3/s) -> Right Axis (Blue dashed) */}
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="apport_journalier" 
                    name="Apport (m³/s)"
                    stroke="#3b82f6" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3b82f6" }}
                >
                     <LabelList dataKey="apport_journalier" position="top" formatter={(v: any) => v ? Number(v).toFixed(1) : ''} style={{ fontSize: 10, fill: '#3b82f6', fontWeight: 'bold' }} />
                </Line>

                {/* Line: Volume (Mm3) -> Left Axis (Orange) */}
                <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="volume_mm3"
                    name="Volume de la retenue (Mm³)"
                    stroke="#ea580c" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#ea580c", strokeWidth: 2 }}
                >
                    <LabelList dataKey="volume_mm3" position="top" dy={-10} formatter={(v: any) => v ? Number(v).toFixed(1) : ''} style={{ fontSize: 11, fill: '#ea580c', fontWeight: 'bold' }} />
                </Line>

            </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

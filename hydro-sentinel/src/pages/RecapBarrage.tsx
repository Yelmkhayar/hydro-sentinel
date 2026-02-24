import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RecapBarrageChart } from "@/components/analysis/charts/RecapBarrageChart";
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from "@/components/CompactFilterBar";
import { useDams, useSources } from "@/hooks/useApi";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { api } from '@/lib/api';

export default function RecapBarrage() {
  const [filters, setFilters] = useState<CompactFilters>({ ...defaultCompactFilters, period: "14d" });
  const [chartData, setChartData] = useState<any[]>([]);
  const { data: damsResult } = useDams();
  const [selectedDamId, setSelectedDamId] = useState<string>("");
  
  const availableStations = (damsResult?.data ?? []).filter((s: any) => s.type.toLowerCase() === 'barrage');

  useEffect(() => {
    if (!selectedDamId && availableStations.length > 0) {
        // Prioritize Al Wahda as per user screenshot context usually
        const defaultSt = availableStations.find((s: any) => s.name.includes("Wahda")) || availableStations[0];
        setSelectedDamId(defaultSt.id);
    }
  }, [availableStations, selectedDamId]);

  const dam = availableStations.find((d: any) => d.id === selectedDamId);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    switch (filters.period) {
      case "24h": start.setHours(end.getHours() - 24); break;
      case "72h": start.setHours(end.getHours() - 72); break;
      case "7d": start.setDate(end.getDate() - 7); break;
      case "14d": 
           // -7 days to +7 days
           start.setDate(end.getDate() - 7);
           end.setDate(end.getDate() + 7);
           break;
      case "30d": start.setDate(end.getDate() - 30); break;
      default: start.setDate(end.getDate() - 7);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [filters.period]);


  // Fetch Data logic
  useEffect(() => {
    if (!selectedDamId) return;

    const fetchData = async () => {
        try {
            // We need 3 variables: inflow (apport), outflow (lacher), volume (retenue)
            // We will fetch OBS data for the selected period
            const varsToFetch = [
                { code: "inflow_m3s", key: "apport_journalier", source: "SIM" },
                { code: "lacher_m3s", key: "lacher_m3s", source: "ABHS_RES" },
                { code: "volume_hm3", key: "volume_mm3", source: "SIM" }
            ];

            const promises = varsToFetch.map(v => 
                api.get('/measurements/timeseries', {
                    params: {
                        station_id: selectedDamId,
                        variable_code: v.code,
                        source_code: v.source, // Use specific source per variable
                        start: dateRange.start,
                        end: dateRange.end
                    }
                }).catch(err => {
                    console.warn(`Failed to fetch ${v.code}`, err);
                    return { data: [] }; // Graceful fallback
                })
            );

            const results = await Promise.all(promises);
            
            // Output format structure from getCompare is typically:
            // [ { time: "...", "OBS": value }, ... ]
            
            // We need to merge them by time
            const mergedMap = new Map<string, any>();

            results.forEach((res, index) => {
                const varDef = varsToFetch[index];
                const seriesData = res.data || [];
                
                seriesData.forEach((pt: any) => {
                    if (!pt.time) return;
                    const dateKey = pt.time.split('T')[0]; // Group by day for "Recap journalier" assumption
                    
                    if (!mergedMap.has(dateKey)) {
                        mergedMap.set(dateKey, { 
                            date: dateKey, // Display date
                            apport_journalier: 0,
                            lacher_m3s: 0,
                            volume_mm3: 0
                        });
                    }
                    
                    const record = mergedMap.get(dateKey);
                    // Use pt.value for the specific variable from /measurements/timeseries
                    const val = pt.value !== undefined && pt.value !== null ? Number(pt.value) : 0;
                    
                    // Note: If data is finer than daily, this currently overwrites. 
                    record[varDef.key] = val;
                });
            });

            // Convert map to sorted array
            const finalData = Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));
            setChartData(finalData);

        } catch (e) {
            console.error("Failed to fetch recap data", e);
        }
    };

    fetchData();
  }, [selectedDamId, dateRange]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Récapitulatif Barrage</h2>
        <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">Journalier</Badge>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Barrage :</span>
          <Select value={selectedDamId} onValueChange={setSelectedDamId}>
            <SelectTrigger className="w-[240px] h-8 text-xs">
              <SelectValue placeholder="Choisir un barrage..." />
            </SelectTrigger>
            <SelectContent>
              {availableStations.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dam && <CriticalityBadge status={"safe"} />}
        </div>

        <CompactFilterBar filters={filters} onChange={setFilters} hideSources={true} />
      </div>

      {dam && (
          <RecapBarrageChart 
            data={chartData} 
            damName={dam.name}
            vn={3522.2} // Example param
            hn={166}    // Example param
          />
      )}
    </div>
  );
}

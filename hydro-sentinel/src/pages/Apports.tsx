import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SingleVariableSelector, type VariableSourceSelection } from "@/components/analysis/SingleVariableSelector";
import { EnhancedMultiSourceChart } from "@/components/analysis/EnhancedMultiSourceChart";
import { ViewModeToggle, type ViewMode } from "@/components/analysis/ViewModeToggle";
import { DataTable } from "@/components/analysis/DataTable";
import { RecapBarrageChart } from "@/components/analysis/charts/RecapBarrageChart";
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from "@/components/CompactFilterBar";
import { useDams, useSources } from "@/hooks/useApi";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { exportToCSV } from "@/lib/exportUtils";
import { BarChart3, LineChart } from "lucide-react";

export default function Apports() {
    // Default period: 14d (interpreted as -7/+7)
    const [filters, setFilters] = useState<CompactFilters>({ ...defaultCompactFilters, period: "14d", sources: ["SIM"] });
    const [viewMode, setViewMode] = useState<ViewMode>('graph');
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');
    const [chartData, setChartData] = useState<any[]>([]);
    const { data: damsResult } = useDams();
    const { data: sourcesResult } = useSources();
    const [selectedDamId, setSelectedDamId] = useState<string>("");
    
    const [variableSelection, setVariableSelection] = useState<VariableSourceSelection>({
      variableCode: "inflow_m3s",
      variableLabel: "Apport",
      unit: "m³/s",
      sources: ["SIM"],
    });

  const handleExport = () => {
    const dam = availableStations.find((d: any) => d.id === selectedDamId);
    const filename = `apports_${dam?.name || 'data'}_${new Date().toISOString().split('T')[0]}`;
    exportToCSV(chartData, filename, variableSelection.variableLabel);
  };

  const availableStations = (damsResult?.data ?? []).filter((s: any) => s.type.toLowerCase() === 'barrage');

  useEffect(() => {
      if (!selectedDamId && availableStations.length > 0) {
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
      case "7d": 
          start.setDate(end.getDate() - 7); 
          break;
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

  const availableVariables = [
    { code: "inflow_m3s", label: "Apport", unit: "m³/s" },
  ];

  const availableSources = sourcesResult?.data?.data ?? [];
  const getDamStatus = (d: any): "safe" | "warning" | "critical" => "safe"; 

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Apports</h2>
        <Badge variant="secondary" className="text-xs">Par barrage</Badge>
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
          {dam && <CriticalityBadge status={getDamStatus(dam)} />}
        </div>

        <CompactFilterBar filters={filters} onChange={setFilters} />
      </div>

      <SingleVariableSelector
        onSelectionChange={setVariableSelection}
        availableVariables={availableVariables}
        availableSources={availableSources.map(s => ({ code: s.code, label: s.label }))}
        defaultVariable="inflow_m3s"
      />

      {/* Volume cards removed as per request */}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {variableSelection.variableLabel} — {dam?.name || "..."}
            </CardTitle>
            <div className="flex items-center gap-2">
                 <div className="flex items-center border rounded-md p-0.5 bg-muted/50 mr-2">
                    <Button
                        variant={chartType === 'line' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setChartType('line')}
                        title="Courbe"
                    >
                        <LineChart className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setChartType('bar')}
                        title="Bâtonnets"
                    >
                        <BarChart3 className="h-4 w-4" />
                    </Button>
                </div>
                <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={handleExport}
                disabled={chartData.length === 0}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'graph' ? (
            <EnhancedMultiSourceChart
              stationId={selectedDamId}
              variableCode={variableSelection.variableCode}
              variableLabel={variableSelection.variableLabel}
              unit={variableSelection.unit}
              sources={variableSelection.sources}
              startDate={dateRange.start}
              endDate={dateRange.end}
              chartType={chartType}
              onDataLoaded={setChartData}
            />
          ) : (
            <DataTable
              data={chartData}
              sources={variableSelection.sources}
              unit={variableSelection.unit}
            />
          )}
        </CardContent>
      </Card>

      {/* NEW: Pro Chart Demo */}
      {/* Pro Chart removed as per request */}
    </div>
  );
}

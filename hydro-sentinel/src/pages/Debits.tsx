import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SingleVariableSelector, type VariableSourceSelection } from "@/components/analysis/SingleVariableSelector";
import { EnhancedMultiSourceChart } from "@/components/analysis/EnhancedMultiSourceChart";
import { ViewModeToggle, type ViewMode } from "@/components/analysis/ViewModeToggle";
import { DataTable } from "@/components/analysis/DataTable";
import { VolumeFlowChart } from "@/components/analysis/charts/VolumeFlowChart";
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from "@/components/CompactFilterBar";
import { useStations, useSources } from "@/hooks/useApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { exportToCSV } from "@/lib/exportUtils";
import { BarChart3, LineChart } from "lucide-react";

export default function Debits() {
  const [filters, setFilters] = useState<CompactFilters>({ ...defaultCompactFilters, sources: ["SIM"], period: "14d" });
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [chartData, setChartData] = useState<any[]>([]);
  const { data: stResult } = useStations({ type: "station" });
  const { data: sourcesResult } = useSources();
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  
  const [variableSelection, setVariableSelection] = useState<VariableSourceSelection>({
    variableCode: "flow_m3s",
    variableLabel: "Débit",
    unit: "m³/s",
    sources: ["SIM"],
  });

  const handleExport = () => {
    const st = availableStations.find((s) => s.id === selectedStationId);
    const filename = `debits_${st?.name || 'data'}_${new Date().toISOString().split('T')[0]}`;
    exportToCSV(chartData, filename, variableSelection.variableLabel);
  };

  const availableStations = useMemo(() => {
    const list = stResult?.data ?? [];
    const richDataNames = ["Wahda", "Sebou", "Soltane", "Sahla", "Asfallou", "Bouhouda", "Galaz", "Ratba", "Tissa"];
    return [...list].sort((a, b) => {
       const aHasData = richDataNames.some(name => a.name.includes(name));
       const bHasData = richDataNames.some(name => b.name.includes(name));
       if (aHasData && !bHasData) return -1;
       if (!aHasData && bHasData) return 1;
       return a.name.localeCompare(b.name);
    });
  }, [stResult]);
  

  useEffect(() => {
    if (!selectedStationId && availableStations.length > 0) {
        setSelectedStationId(availableStations[0].id);
    }
  }, [availableStations, selectedStationId]);

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
    { code: "flow_m3s", label: "Débit", unit: "m³/s" },
  ];

  const availableSources = sourcesResult?.data?.data ?? [];

  const st = availableStations.find((s) => s.id === selectedStationId);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Débits</h2>
        <Badge variant="secondary" className="text-xs">Par station</Badge>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Station :</span>
          <Select value={selectedStationId} onValueChange={setSelectedStationId}>
            <SelectTrigger className="w-[240px] h-8 text-xs">
              <SelectValue placeholder="Choisir une station..." />
            </SelectTrigger>
            <SelectContent>
              {availableStations.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CompactFilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Variable & Source Selector */}
      <SingleVariableSelector
        onSelectionChange={setVariableSelection}
        availableVariables={availableVariables}
        availableSources={availableSources.map(s => ({ code: s.code, label: s.label }))}
        defaultVariable="flow_m3s"
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {variableSelection.variableLabel} — {st?.name || "..."}
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
              stationId={selectedStationId}
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
      {/* Pro Chart Disabled for Debugging
      {selectedStationId && chartData.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">Vue Détaillée (Pro)</h3>
             <VolumeFlowChart 
                data={chartData.map(d => ({
                    date: d.time,
                    value: Number(d['HEC_HMS'] || d['OBS'] || d['Simulé'] || d['Observé'] || 0)
                }))} 
            />
          </div>
      )}
      */}
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SingleVariableSelector, type VariableSourceSelection } from "@/components/analysis/SingleVariableSelector";
import { EnhancedMultiSourceChart } from "@/components/analysis/EnhancedMultiSourceChart";
import { ViewModeToggle, type ViewMode } from "@/components/analysis/ViewModeToggle";
import { DataTable } from "@/components/analysis/DataTable";
import { RainfallBasinChart } from "@/components/analysis/charts/RainfallBasinChart";
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from "@/components/CompactFilterBar";
import { useStations, useSources, useBasins } from "@/hooks/useApi";
import { exportToCSV } from "@/lib/exportUtils";
import { BarChart3, LineChart } from "lucide-react";

export default function Precipitations() {
  const location = useLocation();
  const isBasinView = location.pathname.includes('/bassin');

  // Default period: 14d (interpreted as -7/+7)
  const [filters, setFilters] = useState<CompactFilters>({ ...defaultCompactFilters, period: "14d" });
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line'); // Default to Line (Courbe)
  const [chartData, setChartData] = useState<any[]>([]);
  const { data: stResult } = useStations({});
  const { data: basinsResult } = useBasins();
  const { data: sourcesResult } = useSources();
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [selectedBasinId, setSelectedBasinId] = useState<string>("");
  
  const [variableSelection, setVariableSelection] = useState<VariableSourceSelection>({
    variableCode: "precip_mm",
    variableLabel: "Précipitations",
    unit: "mm",
    sources: ["OBS", "AROME", "ECMWF"],
  });

  const handleExport = () => {
    const st = availableStations.find((s) => s.id === selectedStationId);
    const filename = `precipitations_${st?.name || 'data'}_${new Date().toISOString().split('T')[0]}`;
    exportToCSV(chartData, filename, variableSelection.variableLabel);
  };

  // Auto-select first station when loaded
  // Prioritize data-rich stations for default view
  const availableStations = useMemo(() => {
    const list = stResult?.data ?? [];
    // Stations known to have measurements (from SQL audit)
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

  // Auto-select Basin
  const availableBasins = basinsResult?.data ?? [];
  useEffect(() => {
    if (isBasinView && !selectedBasinId && availableBasins.length > 0) {
        setSelectedBasinId(availableBasins[0].id); // Default to first basin
    }
  }, [isBasinView, availableBasins, selectedBasinId]);

  const st = availableStations.find((s) => s.id === selectedStationId);
  const basin = availableBasins.find((b: any) => b.id === selectedBasinId);
  const currentEntityName = isBasinView ? basin?.name : st?.name;

  // Calculate date range based on period
  // User Request: Default 14d should be -7d to +7d
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
          // Specific logic for Precipitations: -7 days to +7 days
          start.setDate(end.getDate() - 7);
          end.setDate(end.getDate() + 7);
          break;
      case "30d": start.setDate(end.getDate() - 30); break;
      default: start.setDate(end.getDate() - 7);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [filters.period]);

  const availableVariables = [
    { code: "precip_mm", label: "Précipitations", unit: "mm" },
  ];

  const availableSources = sourcesResult?.data?.data ?? [];

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Précipitations</h2>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {isBasinView ? "Bassin :" : "Station :"}
          </span>
          {isBasinView ? (
            <Select value={selectedBasinId} onValueChange={setSelectedBasinId}>
                <SelectTrigger className="w-[240px] h-8 text-xs">
                <SelectValue placeholder="Choisir un bassin..." />
                </SelectTrigger>
                <SelectContent>
                {availableBasins.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
                </SelectContent>
            </Select>
          ) : (
            <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                <SelectTrigger className="w-[240px] h-8 text-xs">
                <SelectValue placeholder="Choisir une station..." />
                </SelectTrigger>
                <SelectContent>
                {availableStations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.type})</SelectItem>
                ))}
                </SelectContent>
            </Select>
          )}

        </div>

        <CompactFilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Variable & Source Selector */}
      <SingleVariableSelector
        onSelectionChange={setVariableSelection}
        availableVariables={availableVariables}
        availableSources={availableSources.map(s => ({ code: s.code, label: s.label }))}
        defaultVariable="precip_mm"
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {variableSelection.variableLabel} — {currentEntityName || "..."}
            </CardTitle>
            <div className="flex items-center gap-2">
                {/* Chart Type Toggle */}
                {viewMode === 'graph' && !isBasinView && (
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
                )}
                
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
                stationId={isBasinView ? selectedBasinId : selectedStationId}
                variableCode={variableSelection.variableCode}
                variableLabel={variableSelection.variableLabel}
                unit={variableSelection.unit}
                sources={variableSelection.sources}
                startDate={dateRange.start}
                endDate={dateRange.end}
                chartType={chartType}
                entityType={isBasinView ? 'bassins' : 'stations'}
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
             <RainfallBasinChart 
                data={chartData.map(d => ({
                    date: d.time,
                    precip_amont: Number(d['OBS'] || d['AVG'] || 0),
                    precip_aval: Number(d['OBS'] || d['AVG'] || 0) * 0.8 // Mock data for demo
                }))} 
            />
          </div>
      )}
      */}
    </div>
  );
}

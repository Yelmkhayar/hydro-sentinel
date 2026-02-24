import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SingleVariableSelector, type VariableSourceSelection } from "@/components/analysis/SingleVariableSelector";
import { EnhancedMultiSourceChart } from "@/components/analysis/EnhancedMultiSourceChart";
import { ViewModeToggle, type ViewMode } from "@/components/analysis/ViewModeToggle";
import { DataTable } from "@/components/analysis/DataTable";
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from "@/components/CompactFilterBar";
import { useDams, useSources } from "@/hooks/useApi";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { exportToCSV } from "@/lib/exportUtils";

export default function Lachers() {
    const [filters, setFilters] = useState<CompactFilters>(defaultCompactFilters);
    const [viewMode, setViewMode] = useState<ViewMode>('graph');
    const [chartData, setChartData] = useState<any[]>([]);
    const { data: damsResult } = useDams();
    const { data: sourcesResult } = useSources();
    const [selectedDamId, setSelectedDamId] = useState<string>("");
    
    const [variableSelection, setVariableSelection] = useState<VariableSourceSelection>({
      variableCode: "lacher_m3s",
      variableLabel: "Lâcher",
      unit: "m³/s",
      sources: ["ABHS_RES"],
    });

  const handleExport = () => {
    const dam = availableStations.find((d: any) => d.id === selectedDamId);
    const filename = `lachers_${dam?.name || 'data'}_${new Date().toISOString().split('T')[0]}`;
    exportToCSV(chartData, filename, variableSelection.variableLabel);
  };

  const availableStations = (damsResult?.data ?? []).filter((s: any) => s.type === 'barrage');

  if (!selectedDamId && availableStations.length > 0) {
      const defaultSt = availableStations.find((s: any) => s.name.includes("Wahda")) || availableStations[0];
      setSelectedDamId(defaultSt.id);
  }

  const dam = availableStations.find((d: any) => d.id === selectedDamId);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    switch (filters.period) {
      case "24h": start.setHours(end.getHours() - 24); break;
      case "72h": start.setHours(end.getHours() - 72); break;
      case "7d": start.setDate(end.getDate() - 7); break;
      case "14d": start.setDate(end.getDate() - 14); break;
      case "30d": start.setDate(end.getDate() - 30); break;
      default: start.setDate(end.getDate() - 7);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [filters.period]);

  const availableVariables = [
    { code: "lacher_m3s", label: "Lâcher", unit: "m³/s" },
  ];

  const availableSources = sourcesResult?.data?.data ?? [];
  const getDamStatus = (d: any): "safe" | "warning" | "critical" => "safe"; 

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Lâchers</h2>
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
        defaultVariable="lacher_m3s"
      />

      {dam && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Volume actuel</p>
              <p className="text-lg font-bold">-- hm³</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Bassin</p>
              <p className="text-lg font-bold">{dam.basin_id}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {variableSelection.variableLabel} — {dam?.name || "..."}
            </CardTitle>
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onExport={handleExport}
              disabled={chartData.length === 0}
            />
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
              chartType="line"
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
    </div>
  );
}

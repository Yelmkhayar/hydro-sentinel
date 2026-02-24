import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVariables, useSources, useRuns, useBasins } from "@/hooks/useApi";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface Filters {
  basin_id: string;
  station_id: string;
  variable: string;
  sources: string[];   // multi-select
  run: string;
  period: string;
  aggregation: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  /** Hide certain filters */
  hideVariable?: boolean;
  contextVariable?: string;
}

export const defaultFilters: Filters = {
  basin_id: "",
  station_id: "",
  variable: "",
  sources: ["OBS", "AROME", "ECMWF"],
  run: "",
  period: "7d",
  aggregation: "raw",
};

const ALL = "__all__";
const toVal = (v: string) => (v === ALL ? "" : v);
const fromVal = (v: string) => (v === "" ? ALL : v);

function LoadingSelect() {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground h-9 px-3 border rounded-md bg-card">
      <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
    </div>
  );
}

export function FilterBar({ filters, onChange, hideVariable, contextVariable }: Props) {
  const { data: varsResult, isLoading: varsLoading } = useVariables();
  const { data: sourcesResult, isLoading: sourcesLoading } = useSources();
  const { data: runsResult, isLoading: runsLoading } = useRuns(
    filters.sources.length === 1 ? filters.sources[0] : undefined
  );
  const { data: basinsResult } = useBasins();

  const variables = varsResult?.data ?? [];
  const sources = sourcesResult?.data?.data ?? []; // Source mock returns { data: { data: [...] } }
  const runs = runsResult?.data ?? [];
  const availableBasins = basinsResult?.data ?? [];
  const fromApi = (varsResult as any)?.fromApi;

  const set = (key: keyof Filters, val: any) => onChange({ ...filters, [key]: key === "sources" ? val : toVal(val) });

  const toggleSource = (code: string) => {
    const current = filters.sources;
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    if (next.length > 0) onChange({ ...filters, sources: next });
  };

  const periods = [
    { value: "24h", label: "24 h" },
    { value: "72h", label: "72 h" },
    { value: "7d", label: "7 jours" },
    { value: "14d", label: "14 jours" },
    { value: "custom", label: "Personnalisé" },
  ];

  const aggregations = [
    { value: "raw", label: "Brut" },
    { value: "hour", label: "Horaire" },
    { value: "day", label: "Journalier" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-card rounded-lg border">
      {fromApi === false && (
        <Badge variant="outline" className="text-warning border-warning/30 text-[10px]">Mock</Badge>
      )}

      {/* Basin */}
      <div className="min-w-[140px]">
        <Select value={fromVal(filters.basin_id)} onValueChange={(v) => set("basin_id", v)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Bassin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous bassins</SelectItem>
            {availableBasins.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Variable */}
      {!hideVariable && (
        <div className="min-w-[140px]">
          {varsLoading ? <LoadingSelect /> : (
            <Select value={fromVal(contextVariable || filters.variable)} onValueChange={(v) => set("variable", v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Variable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes variables</SelectItem>
                {variables.map((v) => (
                  <SelectItem key={v.code} value={v.code}>{v.label} ({v.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Sources (multi-select) */}
      <div className="min-w-[160px]">
        {sourcesLoading ? <LoadingSelect /> : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 text-xs justify-start gap-1 font-normal">
                Sources ({filters.sources.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              {sources.map((s) => (
                <label key={s.code} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs">
                  <Checkbox
                    checked={filters.sources.includes(s.code)}
                    onCheckedChange={() => toggleSource(s.code)}
                  />
                  <span>{s.label}</span>
                  {(s as any).horizon && <span className="text-muted-foreground ml-auto">{(s as any).horizon}</span>}
                </label>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Run */}
      <div className="min-w-[140px]">
        {runsLoading ? <LoadingSelect /> : (
          <Select value={fromVal(filters.run)} onValueChange={(v) => set("run", v)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Run" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous runs</SelectItem>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label || new Date(r.run_time).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Period */}
      <div className="min-w-[100px]">
        <Select value={filters.period} onValueChange={(v) => set("period", v)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aggregation */}
      <div className="min-w-[100px]">
        <Select value={filters.aggregation} onValueChange={(v) => set("aggregation", v)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Agrégation" />
          </SelectTrigger>
          <SelectContent>
            {aggregations.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

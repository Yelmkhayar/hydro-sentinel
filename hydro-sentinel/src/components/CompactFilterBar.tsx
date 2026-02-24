import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSources } from "@/hooks/useApi";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface CompactFilters {
  sources: string[];
  period: string;
}

interface Props {
  filters: CompactFilters;
  onChange: (f: CompactFilters) => void;
  hideSources?: boolean;
}

export const defaultCompactFilters: CompactFilters = {
  sources: ["OBS"],
  period: "7d",
};

const periods = [
  { value: "24h", label: "24h" },
  { value: "72h", label: "72h" },
  { value: "7d", label: "7 jours" },
  { value: "14d", label: "14 jours" },
  { value: "30d", label: "30 jours" },
];

export function CompactFilterBar({ filters, onChange, hideSources = false }: Props) {
  const { data: sourcesResult } = useSources();
  const sources = sourcesResult?.data?.data ?? [];

  const set = (key: keyof CompactFilters, val: any) => onChange({ ...filters, [key]: val });

  const toggleSource = (code: string) => {
    const current = filters.sources;
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    if (next.length > 0) onChange({ ...filters, sources: next });
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border">
      {!hideSources && (
        <>
          {/* Sources (multi-select) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Sources :</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 text-xs justify-start gap-1 font-normal min-w-[120px]">
                  {filters.sources.length > 0 ? filters.sources.join(", ") : "Sélectionner..."}
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
          </div>

          <div className="w-[1px] h-5 bg-border" />
        </>
      )}

      {/* Period */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Période :</span>
        <Select value={filters.period} onValueChange={(v) => set("period", v)}>
          <SelectTrigger className="h-8 text-xs w-[100px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

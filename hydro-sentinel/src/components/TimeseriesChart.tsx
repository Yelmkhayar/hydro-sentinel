import { useMemo } from "react";
import { MultiSourceChart } from "./MultiSourceChart";
import { useCompare } from "@/hooks/useApi";

interface Props {
  entityId?: string;
  variable?: string;
  sources?: string[];
}

export function TimeseriesChart({ entityId = "st-1", variable = "precip_mm", sources = ["OBS", "AROME"] }: Props) {
  const { data: compareResult } = useCompare({ 
      station_id: entityId, 
      variable_code: variable, 
      sources: sources.join(",") 
  });

  const series = useMemo(() => {
    if (!compareResult?.data?.sources) return {};
    
    const output: Record<string, any[]> = {};
    Object.entries(compareResult.data.sources).forEach(([sourceName, points]: [string, any[]]) => {
        output[sourceName] = points.map((p: any) => ({
            date: p.t,
            value: p.y
        }));
    });
    return output;
  }, [compareResult]);

  return (
    <MultiSourceChart
      series={series}
      variable={variable}
      unit=""
      height="100%"
      showDataZoom={false}
    />
  );
}

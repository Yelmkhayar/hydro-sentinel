import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useVariables() {
  return useQuery({ queryKey: ["variables"], queryFn: () => api.getVariables(), staleTime: 5 * 60_000 });
}

export function useSources() {
  return useQuery({ queryKey: ["sources"], queryFn: () => api.getSources(), staleTime: 5 * 60_000 });
}

export function useRuns(source_code?: string) {
  return useQuery({
    queryKey: ["runs", source_code],
    queryFn: () => api.getRuns({ source_code }),
    staleTime: 60_000,
  });
}

export function useStations(params?: { type?: string; basin_id?: string }) {
  return useQuery({
    queryKey: ["stations", params],
    queryFn: () => api.getStations(params),
    staleTime: 5 * 60_000,
  });
}

export function useBasins() {
  return useQuery({ queryKey: ["basins"], queryFn: () => api.getBasins(), staleTime: 5 * 60_000 });
}

export function useDams() {
  return useQuery({ queryKey: ["dams"], queryFn: () => api.getDams(), staleTime: 5 * 60_000 });
}

export function useAlerts(params?: { level?: string; active?: number }) {
  return useQuery({
    queryKey: ["alerts", params],
    queryFn: () => api.getAlerts(params),
    staleTime: 30_000,
  });
}

export function useCompare(params: { station_id: string; variable_code?: string; start?: string; end?: string; sources?: string }) {
  return useQuery({
    queryKey: ["compare", params],
    queryFn: () => api.getCompare(params),
    enabled: !!params.station_id,
    staleTime: 60_000,
  });
}

export function useKpis(params?: { basin_id?: string; window?: string }) {
  return useQuery({
    queryKey: ["kpis", params],
    queryFn: () => api.getKpis(params),
    staleTime: 30_000,
  });
}

export function useIngestions() {
  return useQuery({ queryKey: ["ingestions"], queryFn: () => api.getIngestions(), staleTime: 30_000 });
}

export function useHealth() {
  return useQuery({ queryKey: ["health"], queryFn: () => api.getHealth(), staleTime: 10_000 });
}

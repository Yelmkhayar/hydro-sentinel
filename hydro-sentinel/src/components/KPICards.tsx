import { Card, CardContent } from "@/components/ui/card";
import { Droplets, AlertTriangle, Activity, Database, Clock } from "lucide-react";
import { useKpis } from "@/hooks/useApi";

export function KPICards({ basinId }: { basinId?: string }) {
  const { data: result } = useKpis({ basin_id: basinId });
  const kpi = result?.data;

  const items = [
    {
      label: "Pluie 24h",
      value: kpi ? `${kpi.precip_cumul_24h} mm` : "—",
      icon: Droplets, accent: false,
    },
    {
      label: "Pluie 72h",
      value: kpi ? `${kpi.precip_cumul_72h} mm` : "—",
      icon: Droplets, accent: false,
    },
    {
      label: "Débit moyen",
      value: kpi ? `${kpi.debit_moyen} m³/s` : "—",
      icon: Activity, accent: false,
    },
    {
      label: "Volume stocké",
      value: kpi ? `${kpi.volume_total} hm³` : "—",
      icon: Database, accent: false,
    },
    {
      label: "Alertes",
      value: kpi ? String(kpi.nb_alertes) : "—",
      icon: AlertTriangle, accent: true,
    },
    {
      label: "Dernière ingestion",
      value: kpi?.derniere_ingestion
        ? new Date(kpi.derniere_ingestion).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
        : "—",
      icon: Clock, accent: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((k) => (
        <Card key={k.label} className="border-border/50">
          <CardContent className="p-3 flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${k.accent ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground truncate">{k.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{k.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

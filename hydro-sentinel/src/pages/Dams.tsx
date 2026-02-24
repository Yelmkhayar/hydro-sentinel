import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDams } from "@/hooks/useApi";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TimeseriesChart } from "@/components/TimeseriesChart";
import { Building2 } from "lucide-react";

export default function Dams() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: damsResult } = useDams();
  const dams = damsResult?.data ?? [];
  const dam = dams.find((d) => d.id === selectedId);

  // Placeholders
  const getDamStatus = (d: any) => "safe" as const;
  const getDamFillPct = (d: any) => 0;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-xl font-bold">Barrages</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dams.map((d) => {
          const status = getDamStatus(d);
          const pct = getDamFillPct(d);
          return (
            <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(d.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {d.name}
                  </CardTitle>
                  <CriticalityBadge status={status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remplissage</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          status === "safe" ? "hsl(var(--safe))" :
                          status === "warning" ? "hsl(var(--warning))" : "hsl(var(--critical))",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>-- Mm³</span>
                    <span>-- Mm³</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {dam?.name}
              {dam && <CriticalityBadge status={getDamStatus(dam)} />}
            </SheetTitle>
          </SheetHeader>
          {dam && (
            <div className="mt-4 space-y-4">
              <p className="text-sm"><span className="text-muted-foreground">Bassin :</span> {dam.basin_id}</p>
              <p className="text-sm"><span className="text-muted-foreground">Capacité :</span> -- Mm³</p>
              <p className="text-sm"><span className="text-muted-foreground">Volume :</span> -- Mm³</p>
              <p className="text-sm"><span className="text-muted-foreground">Remplissage :</span> {getDamFillPct(dam)}%</p>
              
              <Card className="bg-muted/50 border-0">
                <CardContent className="p-3">
                  <p className="text-sm font-medium mb-1">Recommandation</p>
                  <p className="text-sm">Données connectées à l'API.</p>
                </CardContent>
              </Card>
              <div>
                <h4 className="text-sm font-medium mb-2">Apports — Observé vs Simulé</h4>
                <div className="h-[250px]">
                  <TimeseriesChart entityId={dam.id} variable="inflow_m3s" sources={["OBS"]} />
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

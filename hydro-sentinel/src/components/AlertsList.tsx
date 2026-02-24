import { CriticalityBadge } from "./CriticalityBadge";
import { useAlerts } from "@/hooks/useApi";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AlertsList() {
  const { data: alertsResult } = useAlerts();
  const alerts = alertsResult?.data ?? [];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {alerts.length === 0 ? (
           <p className="text-xs text-muted-foreground text-center py-4">Aucune alerte en cours</p>
        ) : (
            alerts.map((alert: any) => (
            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <CriticalityBadge status={alert.status} />
                <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{alert.entity_name}</p>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
            </div>
            ))
        )}
      </div>
    </ScrollArea>
  );
}

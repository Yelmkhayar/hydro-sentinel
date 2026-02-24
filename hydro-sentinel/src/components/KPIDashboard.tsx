import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, AlertTriangle, Droplets, Activity } from 'lucide-react';

export interface KPIDashboardProps {
  totalStations?: number;
  activeAlerts?: number;
  avgPrecip24h?: number;
  maxDebit?: number;
}

export function KPIDashboard({
  totalStations = 0,
  activeAlerts = 0,
  avgPrecip24h = 0,
  maxDebit = 0,
}: KPIDashboardProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Stations</p>
              <p className="text-xl font-bold">{totalStations}</p>
            </div>
            <Activity className="h-7 w-7 text-blue-500 opacity-70" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Alertes</p>
              <p className="text-xl font-bold text-red-600">{activeAlerts}</p>
            </div>
            <AlertTriangle className="h-7 w-7 text-red-500 opacity-70" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-cyan-500">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pluie 24h</p>
              <p className="text-xl font-bold">{avgPrecip24h.toFixed(1)}<span className="text-xs ml-0.5">mm</span></p>
            </div>
            <Droplets className="h-7 w-7 text-cyan-500 opacity-70" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Débit Max</p>
              <p className="text-xl font-bold">{maxDebit.toFixed(1)}<span className="text-xs ml-0.5">m³/s</span></p>
            </div>
            <TrendingUp className="h-7 w-7 text-emerald-500 opacity-70" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

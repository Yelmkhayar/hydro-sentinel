import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TimeseriesChart } from "@/components/TimeseriesChart";
import { useStations } from "@/hooks/useApi";

export default function Stations() {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const { data: stationsResult } = useStations();
  
  const stations = stationsResult?.data ?? [];
  const st = stations.find((s) => s.id === selectedStationId);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-xl font-bold">Stations</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bassin</TableHead>
                {/* Lat/Lon might not be in the main list depending on model, assuming they are or we use geom */}
                {/* <TableHead>Lat</TableHead>
                <TableHead>Lon</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedStationId(s.id)}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="secondary">{s.type}</Badge></TableCell>
                  <TableCell>{s.basin_id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedStationId} onOpenChange={() => setSelectedStationId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{st?.name}</SheetTitle>
          </SheetHeader>
          {st && (
            <div className="mt-4 space-y-4">
              <p className="text-sm"><span className="text-muted-foreground">Type :</span> {st.type}</p>
              <p className="text-sm"><span className="text-muted-foreground">Bassin :</span> {st.basin_id}</p>
              <div>
                <h4 className="text-sm font-medium mb-2">Observé vs Simulé</h4>
                <div className="h-[250px]">
                  <TimeseriesChart entityId={st.id} />
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

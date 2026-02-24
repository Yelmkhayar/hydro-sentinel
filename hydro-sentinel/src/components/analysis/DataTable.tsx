import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimeseriesData {
  time: string;
  [key: string]: number | string;
}

interface DataTableProps {
  data: TimeseriesData[];
  sources: string[];
  unit: string;
}

export function DataTable({ data, sources, unit }: DataTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground border rounded-lg bg-muted/20">
        Aucune donnée disponible
      </div>
    );
  }

  const formatValue = (value: number | string | undefined): string => {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  return (
    <div className="border rounded-lg">
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="font-semibold">Date/Heure</TableHead>
              {sources.map((source) => (
                <TableHead key={source} className="font-semibold text-right">
                  {source} ({unit})
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="font-mono text-xs">{row.time}</TableCell>
                {sources.map((source) => (
                  <TableCell key={source} className="text-right font-mono text-xs">
                    {formatValue(row[source] as number | undefined)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataAvailabilityReport {
  stations: Record<string, {
    count: number;
    variables: Record<string, {
      sources: Record<string, {
        record_count: number;
        first_record: string | null;
        last_record: string | null;
      }>;
    }>;
  }>;
  basins: Record<string, {
    count: number;
    variables: Record<string, any>;
  }>;
  summary: {
    total_stations: number;
    total_basins: number;
    total_variables: number;
    total_sources: number;
    total_records: number;
    available_variables: string[];
    available_sources: string[];
  };
}

export function DataAvailabilityScanner() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DataAvailabilityReport | null>(null);
  const { toast } = useToast();

  const scanData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/admin/data-availability');
      if (!response.ok) {
        throw new Error('Failed to scan data');
      }
      const data = await response.json();
      setReport(data);
      toast({
        title: 'Scan terminé',
        description: `${data.summary.total_records.toLocaleString()} enregistrements analysés`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de scanner les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!report) return;
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-availability-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Export réussi',
      description: 'Le rapport a été téléchargé',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scanner de disponibilité des données</CardTitle>
          <CardDescription>
            Analysez toutes les entités et variables disponibles dans la base de données
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={scanData} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scan en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Lancer le scan
                </>
              )}
            </Button>
            {report && (
              <Button onClick={exportReport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter (JSON)
              </Button>
            )}
          </div>

          {report && (
            <div className="space-y-6">
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Stations</CardDescription>
                    <CardTitle className="text-3xl">{report.summary.total_stations}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Bassins</CardDescription>
                    <CardTitle className="text-3xl">{report.summary.total_basins}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Variables</CardDescription>
                    <CardTitle className="text-3xl">{report.summary.total_variables}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Sources</CardDescription>
                    <CardTitle className="text-3xl">{report.summary.total_sources}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Enregistrements</CardDescription>
                    <CardTitle className="text-3xl">
                      {(report.summary.total_records / 1000).toFixed(1)}k
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Available Variables and Sources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Variables disponibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {report.summary.available_variables.map((variable) => (
                        <Badge key={variable} variant="secondary">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sources disponibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {report.summary.available_sources.map((source) => (
                        <Badge key={source} variant="secondary">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stations by Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stations par type</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type de station</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Variables</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(report.stations).map(([type, data]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium">{type}</TableCell>
                          <TableCell>{data.count}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.keys(data.variables).map((variable) => (
                                <Badge key={variable} variant="outline" className="text-xs">
                                  {variable}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Detailed Variable Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Détails des variables par type de station</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(report.stations).map(([stationType, stationData]) => (
                      <div key={stationType} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 capitalize">{stationType}</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Variable</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Enregistrements</TableHead>
                              <TableHead>Première donnée</TableHead>
                              <TableHead>Dernière donnée</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(stationData.variables).map(([variable, varData]) =>
                              Object.entries(varData.sources).map(([source, sourceData]) => (
                                <TableRow key={`${variable}-${source}`}>
                                  <TableCell className="font-medium">{variable}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{source}</Badge>
                                  </TableCell>
                                  <TableCell>{sourceData.record_count.toLocaleString()}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {sourceData.first_record
                                      ? new Date(sourceData.first_record).toLocaleDateString('fr-FR')
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {sourceData.last_record
                                      ? new Date(sourceData.last_record).toLocaleDateString('fr-FR')
                                      : '-'}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

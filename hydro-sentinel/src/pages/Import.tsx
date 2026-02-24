import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, CheckCircle2, AlertTriangle, XCircle, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function Import() {
  const [activeTab, setActiveTab] = useState("ingest");
  const queryClient = useQueryClient();

  // Ingestion State
  const [file, setFile] = useState<File | null>(null);
  const [ingestionType, setIngestionType] = useState<string>("abhs");
  const [sourceCode, setSourceCode] = useState<string>("ABHS_RES");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Queries
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["ingestions"],
    queryFn: () => api.getIngestionsHistory(),
    refetchInterval: 5000, // Live update
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setAnalysisResult(null); // Reset analysis on new file
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv', '.txt']
    },
    maxFiles: 1
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", ingestionType);
    if (ingestionType === "abhs") {
        formData.append("source_code", sourceCode);
    }

    try {
      const res = await api.uploadAnalysis(formData);
      setAnalysisResult(res.data);
      if (res.data.status === 'success') {
        toast.success("Analyse terminée avec succès");
      } else {
        toast.warning("L'analyse a retourné des avertissements/erreurs");
      }
    } catch (error: any) {
      toast.error("Erreur lors de l'analyse: " + error.message);
      setAnalysisResult({ 
          status: 'error', 
          message: "Erreur de connexion au serveur d'ingestion (Port 8000)", 
          logs: error.message 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    if (!file || !analysisResult) return;
    setIsExecuting(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", ingestionType);
    if (ingestionType === "abhs") {
        formData.append("source_code", sourceCode);
    }

    try {
      const res = await api.uploadExecute(formData);
      if (res.data.status === 'success') {
        toast.success("Ingestion réussie !");
        setFile(null);
        setAnalysisResult(null);
        setActiveTab("history");
        queryClient.invalidateQueries({ queryKey: ["ingestions"] });
      } else {
        toast.error("Échec de l'ingestion");
         setAnalysisResult(res.data); // Update logs
      }
    } catch (error: any) {
      toast.error("Erreur critique: " + error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Ingestions</h2>
            <p className="text-muted-foreground">Importer et gérer les données hydrologiques</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="ingest" className="gap-2"><Upload className="h-4 w-4"/> Nouvel Import</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><FileText className="h-4 w-4"/> Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="ingest" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Left: Configuration */}
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-base">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de données</Label>
                  <Select value={ingestionType} onValueChange={setIngestionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abhs">Résultats ABHS (Excel)</SelectItem>
                      <SelectItem value="precip">Précipitations (Excel)</SelectItem>
                      <SelectItem value="datatable">Données Stations (CSV/DataTable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ingestionType === "abhs" && (
                    <div className="space-y-2">
                    <Label>Code Source (ref.source)</Label>
                    <Input 
                        value={sourceCode} 
                        onChange={(e) => setSourceCode(e.target.value)} 
                        placeholder="ABHS_RES" 
                    />
                    <p className="text-xs text-muted-foreground">Ex: ABHS_RES ou ABHS_1302</p>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Fichier Source</Label>
                    <div
                        {...getRootProps()}
                        className={`
                        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                        ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}
                        ${file ? "border-green-500/50 bg-green-500/5" : ""}
                        `}
                    >
                        <input {...getInputProps()} />
                        {file ? (
                        <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 text-green-500" />
                            <span className="text-sm font-medium break-all">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm">Glisser ou cliquer</span>
                        </div>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <Button 
                        className="w-full" 
                        onClick={handleAnalyze} 
                        disabled={!file || isAnalyzing || isExecuting}
                    >
                        {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "1. Analyser le fichier"}
                    </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right: Analysis & Execution */}
            <Card className="md:col-span-2 flex flex-col min-h-[500px]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Rapport d'analyse & Logs</CardTitle>
                {analysisResult && (
                    <Badge variant={analysisResult.status === 'success' ? 'default' : 'destructive'}>
                        {analysisResult.status?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                {analysisResult ? (
                    <>
                        <Alert variant={analysisResult.status === 'success' ? 'default' : 'destructive'}>
                            {analysisResult.status === 'success' ? <CheckCircle2 className="h-4 w-4"/> : <AlertTriangle className="h-4 w-4"/>}
                            <AlertTitle>{analysisResult.message}</AlertTitle>
                            <AlertDescription>
                                Vérifiez les logs ci-dessous avant de confirmer l'importation.
                            </AlertDescription>
                        </Alert>

                        <div className="flex-1 relative border rounded-md bg-black/95 text-green-400 font-mono text-xs p-4 overflow-hidden">
                             <ScrollArea className="h-full w-full">
                                <pre className="whitespace-pre-wrap">{analysisResult.logs}</pre>
                             </ScrollArea>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                        <div className="text-center">
                            <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p>En attente d'analyse...</p>
                        </div>
                    </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 bg-muted/20">
                    <div className="flex justify-between w-full items-center">
                        <p className="text-xs text-muted-foreground">
                            Mode "Dry-Run" : Aucune donnée n'est encore écrite en base.
                        </p>
                        <Button 
                            variant={analysisResult?.status === 'success' ? 'default' : 'secondary'}
                            onClick={handleExecute}
                            disabled={!analysisResult || isExecuting}
                            className="w-40"
                        >
                            {isExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "2. Confirmer l'Import"}
                        </Button>
                    </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
                <CardTitle>Historique des imports</CardTitle>
                <CardDescription>Tous les imports effectués via cet outil ou les scripts</CardDescription>
            </CardHeader>
            <CardContent>
                {historyLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        {history?.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun historique.</p>}
                        {history?.map((ingest: any) => (
                            <div key={ingest.ingestion_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    {ingest.status === 'success' ? (
                                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                    ) : ingest.status === 'running' ? (
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full animate-pulse">
                                            <RefreshCcw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium">{ingest.pipeline_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(ingest.started_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant="outline" className="mb-1">{ingest.status}</Badge>
                                    <p className="text-xs text-muted-foreground max-w-[300px] truncate">
                                        {typeof ingest.summary === 'string' ? ingest.summary : JSON.stringify(ingest.summary)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

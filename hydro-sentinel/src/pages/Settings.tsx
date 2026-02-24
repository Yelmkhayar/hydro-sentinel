import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Database, CheckCircle2, XCircle, Loader2, Activity } from "lucide-react";

interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    database_version?: string;
    schemas_found?: string[];
    sample_views?: string[];
  };
}

export default function Settings() {
  const [dbUrl, setDbUrl] = useState("postgresql+asyncpg://postgres:****@localhost:5432/app_inondation_db");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [executionLogs, setExecutionLogs] = useState<{time: string, type: 'INFO' | 'SUCCESS' | 'ERROR', message: string}[]>([]);
  const [apiLogs, setApiLogs] = useState<{time: string, endpoint: string, status: string, details: string}[]>([]);
  const [testingApi, setTestingApi] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setExecutionLogs([
      { time: new Date().toLocaleTimeString(), type: 'INFO', message: `Initialisation du test vers ${dbUrl.split('@')[1] || 'localhost'}...` },
      { time: new Date().toLocaleTimeString(), type: 'INFO', message: "Envoi de la requête au serveur d'administration..." }
    ]);

    try {
      const response = await api.post<ConnectionTestResult>("/admin/test-connection", {
        database_url: dbUrl
      });
      
      setTestResult(response.data);
      
      if (response.data.success) {
        setExecutionLogs(prev => [
          ...prev,
          { time: new Date().toLocaleTimeString(), type: 'SUCCESS', message: "Réponse reçue: Connexion établie" },
          { time: new Date().toLocaleTimeString(), type: 'SUCCESS', message: `Version DB: ${response.data.details?.database_version}` }
        ]);
        toast.success("Connexion réussie !");
      } else {
        setExecutionLogs(prev => [
          ...prev,
          { time: new Date().toLocaleTimeString(), type: 'ERROR', message: `Échec: ${response.data.message}` }
        ]);
        toast.error("Échec de la connexion");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || "Erreur inconnue";
      setTestResult({
        success: false,
        message: errorMsg
      });
      setExecutionLogs(prev => [
        ...prev,
        { time: new Date().toLocaleTimeString(), type: 'ERROR', message: `Erreur réseau ou timeout: ${errorMsg}` }
      ]);
      toast.error("Erreur lors du test");
    } finally {
      setTesting(false);
    }
  };

  const testSpecificEndpoint = async (label: string, url: string) => {
    setTestingApi(true);
    const time = new Date().toLocaleTimeString();
    
    try {
      const response = await api.get(url);
      const count = Array.isArray(response.data) ? response.data.length : (response.data.items ? response.data.items.length : 'N/A');
      
      let sample = "";
      if (Array.isArray(response.data) && response.data.length > 0) {
        sample = "\nSample: " + JSON.stringify(response.data[0], null, 2).substring(0, 200) + "...";
      }

      setApiLogs(prev => [{
        time,
        endpoint: url,
        status: 'SUCCESS',
        details: `${label}: ${count} éléments trouvés.${sample}`
      }, ...prev]);
      
      toast.success(`${label} OK`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || "Erreur inconnue";
      setApiLogs(prev => [{
        time,
        endpoint: url,
        status: 'ERROR',
        details: `Échec: ${errorMsg}`
      }, ...prev]);
      toast.error(`Erreur sur ${label}`);
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Paramètres</h2>
        <p className="text-sm text-muted-foreground">Configuration de l'application et de la base de données</p>
      </div>

      {/* Database Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuration de la base de données
          </CardTitle>
          <CardDescription>
            Testez la connexion à votre base PostgreSQL. (Ne modifie pas le fichier .env)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="db-url">URL de connexion PostgreSQL</Label>
            <Input
              id="db-url"
              type="text"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="postgresql+asyncpg://user:password@host:port/database"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Format: postgresql+asyncpg://username:password@host:port/database_name
            </p>
            {dbUrl.includes("****") && (
                <p className="text-xs text-warning font-medium">
                    Attention : Remplacez les astérisques (****) par le mot de passe réel avant de tester.
                </p>
            )}
          </div>

          <Button 
            onClick={handleTestConnection} 
            disabled={testing || !dbUrl || dbUrl.includes("****")}
            className="w-full sm:w-auto"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Tester la connexion
              </>
            )}
          </Button>

          {/* Test Result and Logs */}
          <div className="space-y-4 pt-4">
            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <div className="flex-1 space-y-2">
                    <AlertDescription className="font-medium">
                      {testResult.message}
                    </AlertDescription>
                    
                    {testResult.success && testResult.details && (
                      <div className="text-xs space-y-2 mt-2">
                        {testResult.details.database_version && (
                          <div>
                            <span className="font-medium">Version: </span>
                            <span className="text-muted-foreground">{testResult.details.database_version}</span>
                          </div>
                        )}
                        
                        {testResult.details.schemas_found && testResult.details.schemas_found.length > 0 && (
                          <div>
                            <span className="font-medium">Schémas trouvés: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {testResult.details.schemas_found.map(schema => (
                                <Badge key={schema} variant="secondary" className="text-xs">
                                  {schema}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            {(testing || executionLogs.length > 0) && (
              <div className="rounded-md border bg-slate-950 p-4 font-mono text-xs text-slate-200">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Log d'exécution du test</span>
                  <div className="flex items-center gap-2">
                    {testing && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">DEBUG</Badge>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                  {executionLogs.map((log, i) => (
                    <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-1 duration-300">
                      <span className="text-slate-500 min-w-[70px] whitespace-nowrap">[{log.time}]</span>
                      <span className={`min-w-[50px] font-bold ${
                        log.type === 'SUCCESS' ? 'text-green-400' : 
                        log.type === 'ERROR' ? 'text-red-400' : 
                        'text-blue-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))}
                  {testing && (
                    <div className="flex items-center gap-2 text-blue-400/70 italic animate-pulse">
                      <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>
                      <span>En attente du résultat serveur...</span>
                    </div>
                  )}
                  {!testing && executionLogs.length > 0 && (
                    <div className="flex gap-2 italic text-slate-500 pt-1 border-t border-slate-900 mt-2">
                       <span>-- Fin du diagnostic --</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Diagnostics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Diagnostics API
          </CardTitle>
          <CardDescription>
            Testez les principaux points d'entrée de l'API pour vérifier l'intégrité des données.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Points KPI (Carte)", url: "/map/points-kpi" },
              { label: "Stations", url: "/stations" },
              { label: "Bassins", url: "/basins" },
              { label: "Variables", url: "/variables" }
            ].map((test) => (
              <Button 
                key={test.url} 
                variant="outline" 
                size="sm"
                onClick={() => testSpecificEndpoint(test.label, test.url)}
                disabled={testingApi}
                className="text-xs"
              >
                Test {test.label}
              </Button>
            ))}
          </div>

          {/* API Test Console */}
          <div className="rounded-md border bg-slate-950 p-4 font-mono text-xs text-slate-200">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-400 uppercase tracking-wider">Console de Diagnostics API</span>
              <div className="flex items-center gap-2">
                {testingApi && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">API LOGS</Badge>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              {apiLogs.length === 0 ? (
                <div className="text-slate-600 italic">Cliquez sur un bouton pour tester un endpoint...</div>
              ) : (
                apiLogs.map((log, i) => (
                  <div key={i} className="border-b border-slate-900 pb-1 mb-1">
                    <div className="flex gap-2">
                      <span className="text-slate-500">[{log.time}]</span>
                      <span className={`font-bold ${log.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>
                        {log.status}
                      </span>
                      <span className="text-blue-400">{log.endpoint}</span>
                    </div>
                    {log.details && (
                      <div className="pl-4 mt-1 text-slate-400 whitespace-pre-wrap">
                        {log.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

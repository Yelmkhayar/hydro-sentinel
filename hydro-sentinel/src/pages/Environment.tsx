import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Info } from "lucide-react";

export default function Environment() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const apiPrefix = import.meta.env.VITE_API_PREFIX || "/api/v1";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Connexion / Environnement</h2>
        <p className="text-sm text-muted-foreground">Configuration de l'environnement frontend</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuration Backend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">URL de base</span>
              <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                {apiBaseUrl}
              </code>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Préfixe API</span>
              <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                {apiPrefix}
              </code>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">URL complète</span>
              <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                {apiBaseUrl}{apiPrefix}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variables d'environnement frontend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">VITE_API_BASE_URL</span>
              <span>=</span>
              <span>{import.meta.env.VITE_API_BASE_URL || "(non défini)"}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">VITE_API_PREFIX</span>
              <span>=</span>
              <span>{import.meta.env.VITE_API_PREFIX || "/api/v1 (défaut)"}</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Configuration actuelle</p>
                <p>
                  Le frontend se connecte à <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{apiBaseUrl}{apiPrefix}</code>
                </p>
                <p className="mt-2">
                  Pour modifier, créez un fichier <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env</code> avec :
                </p>
                <pre className="mt-1 bg-blue-100 dark:bg-blue-900 p-2 rounded text-xs">
VITE_API_BASE_URL=http://localhost:8000
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">État de la connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pour tester la connexion à la base de données, allez sur la page{" "}
            <a href="/settings" className="text-primary hover:underline font-medium">
              Paramètres
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

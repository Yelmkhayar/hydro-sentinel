import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Variable {
  code: string;
  name: string;
  unit: string;
}

interface VariableSelectorProps {
  selectedVariables: string[];
  onSelectionChange: (variables: string[]) => void;
}

export function VariableSelector({ selectedVariables, onSelectionChange }: VariableSelectorProps) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVariables = async () => {
      try {
        const response = await api.get<Variable[]>("/variables");
        setVariables(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Erreur lors du chargement des variables");
        console.error("Failed to fetch variables:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVariables();
  }, []);

  const handleToggle = (code: string) => {
    if (selectedVariables.includes(code)) {
      onSelectionChange(selectedVariables.filter(v => v !== code));
    } else {
      onSelectionChange([...selectedVariables, code]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Chargement des variables...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (variables.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Aucune variable disponible
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Variables à afficher</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {variables.map((variable) => (
          <div
            key={variable.code}
            className="flex items-center space-x-2 p-2 rounded-md border hover:bg-accent cursor-pointer transition-colors"
            onClick={() => handleToggle(variable.code)}
          >
            <Checkbox
              id={variable.code}
              checked={selectedVariables.includes(variable.code)}
              onCheckedChange={() => handleToggle(variable.code)}
            />
            <div className="flex-1 min-w-0">
              <label
                htmlFor={variable.code}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {variable.name}
              </label>
              <p className="text-xs text-muted-foreground truncate">
                {variable.unit}
              </p>
            </div>
            {selectedVariables.includes(variable.code) && (
              <Badge variant="secondary" className="text-xs">✓</Badge>
            )}
          </div>
        ))}
      </div>
      {selectedVariables.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedVariables.length} variable{selectedVariables.length > 1 ? 's' : ''} sélectionnée{selectedVariables.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

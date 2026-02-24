import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface VariableSourceSelection {
  variableCode: string;
  variableLabel: string;
  unit: string;
  sources: string[];
}

interface Props {
  onSelectionChange: (selection: VariableSourceSelection) => void;
  availableVariables: Array<{ code: string; label: string; unit: string }>;
  availableSources: Array<{ code: string; label: string }>;
  defaultVariable?: string;
}

export function SingleVariableSelector({
  onSelectionChange,
  availableVariables,
  availableSources,
  defaultVariable,
}: Props) {
  const [selectedVariable, setSelectedVariable] = useState<string>(
    defaultVariable || availableVariables[0]?.code || ""
  );
  // Default sources should ideally come from props or default to first available, but 'OBS' is a safe default for now
  const [selectedSources, setSelectedSources] = useState<string[]>(["OBS", "HEC_HMS"]);

  const handleVariableChange = (variableCode: string) => {
    setSelectedVariable(variableCode);
    const variable = availableVariables.find((v) => v.code === variableCode);
    if (variable) {
      onSelectionChange({
        variableCode: variable.code,
        variableLabel: variable.label,
        unit: variable.unit,
        sources: selectedSources,
      });
    }
  };

  const toggleSource = (sourceCode: string) => {
    const newSources = selectedSources.includes(sourceCode)
      ? selectedSources.filter((s) => s !== sourceCode)
      : [...selectedSources, sourceCode];

    // Ensure at least one source is selected
    if (newSources.length === 0) return;

    setSelectedSources(newSources);
    const variable = availableVariables.find((v) => v.code === selectedVariable);
    if (variable) {
      onSelectionChange({
        variableCode: variable.code,
        variableLabel: variable.label,
        unit: variable.unit,
        sources: newSources,
      });
    }
  };

  const currentVariable = availableVariables.find((v) => v.code === selectedVariable);

  return (
    <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border">
      {/* Variable Selection */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Variable :</span>
        <Select value={selectedVariable} onValueChange={handleVariableChange}>
          <SelectTrigger className="h-8 text-xs w-[180px]">
            <SelectValue placeholder="Choisir une variable..." />
          </SelectTrigger>
          <SelectContent>
            {availableVariables.map((v) => (
              <SelectItem key={v.code} value={v.code}>
                {v.label} ({v.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[1px] h-5 bg-border" />

      {/* Multi-Source Selection */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Sources :</span>
        <div className="flex items-center gap-2">
          {availableSources.map((source) => (
            <Label
              key={source.code}
              className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded text-xs"
            >
              <Checkbox
                checked={selectedSources.includes(source.code)}
                onCheckedChange={() => toggleSource(source.code)}
              />
              <span>{source.label}</span>
            </Label>
          ))}
        </div>
      </div>

      {currentVariable && (
        <div className="ml-auto text-xs text-muted-foreground">
          {selectedSources.length} source{selectedSources.length > 1 ? "s" : ""} sélectionnée
          {selectedSources.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

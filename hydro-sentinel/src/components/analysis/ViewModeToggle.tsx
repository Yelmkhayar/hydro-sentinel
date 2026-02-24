import { Button } from "@/components/ui/button";
import { LineChart, LayoutGrid, FileDown } from "lucide-react";

export type ViewMode = 'graph' | 'table';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExport: () => void;
  disabled?: boolean;
}

export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  onExport,
  disabled = false,
}: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
      <Button
        variant={viewMode === 'graph' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('graph')}
        disabled={disabled}
        className="h-7 px-3 text-xs gap-1.5"
      >
        <LineChart className="h-3.5 w-3.5" />
        Graphique
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('table')}
        disabled={disabled}
        className="h-7 px-3 text-xs gap-1.5"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Tableau
      </Button>
      <div className="w-px h-5 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={onExport}
        disabled={disabled}
        className="h-7 px-3 text-xs gap-1.5"
      >
        <FileDown className="h-3.5 w-3.5" />
        Exporter
      </Button>
    </div>
  );
}

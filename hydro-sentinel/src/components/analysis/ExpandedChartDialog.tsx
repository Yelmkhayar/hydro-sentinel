import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnifiedChart, CompactVariableSelection } from "./UnifiedChart";

interface ExpandedChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationId: string;
  stationName?: string;
  selections: CompactVariableSelection[];
}

export function ExpandedChartDialog({
  open,
  onOpenChange,
  stationId,
  stationName,
  selections,
}: ExpandedChartDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Analyse détaillée : {stationName || stationId}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 w-full pt-4">
            <UnifiedChart 
                stationId={stationId} 
                selections={selections} 
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}

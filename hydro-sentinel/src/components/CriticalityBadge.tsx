import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const labels = { safe: "Normal", warning: "Vigilance", critical: "Critique" };

interface Props {
  status: "safe" | "warning" | "critical";
  className?: string;
}

export function CriticalityBadge({ status, className }: Props) {
  return (
    <Badge
      className={cn(
        "text-xs font-semibold border-0",
        status === "safe" && "bg-safe text-safe-foreground",
        status === "warning" && "bg-warning text-warning-foreground",
        status === "critical" && "bg-critical text-critical-foreground",
        className
      )}
    >
      {labels[status]}
    </Badge>
  );
}

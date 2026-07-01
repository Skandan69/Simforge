import {
  CheckCircle2,
  CircleX,
  Clock3,
  LoaderCircle,
  Upload,
  XCircle,
} from "lucide-react";
import type { ProcessingStatus } from "@simforge/shared";
import { Badge } from "@/components/ui/badge";
const icons = {
  Uploaded: Upload,
  Queued: Clock3,
  Processing: LoaderCircle,
  Completed: CheckCircle2,
  Failed: CircleX,
  Cancelled: XCircle,
};
export function ProcessingStatusBadge({
  status,
}: {
  status: ProcessingStatus;
}) {
  const Icon = icons[status];
  return (
    <Badge
      variant={
        status === "Completed"
          ? "success"
          : status === "Failed"
        ? "warning"
            : "secondary"
      }
      className="gap-1"
    >
      <Icon
        className={status === "Processing" ? "size-3 animate-spin" : "size-3"}
      />
      {status}
    </Badge>
  );
}

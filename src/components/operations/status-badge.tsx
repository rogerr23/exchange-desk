import type { OperationStatus } from "@/domain/operation-status";
import { statusLabels } from "@/lib/format";
export function StatusBadge({ status }: { status: OperationStatus }) {
  const colors = {
    PENDING: "bg-warning/10 text-warning",
    UNDER_REVIEW: "bg-brand-soft text-brand-ink",
    COMPLETED: "bg-positive/10 text-positive",
    CANCELED: "bg-canvas text-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${colors[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  );
}

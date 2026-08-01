import { cn } from "@/lib/utils";
import { STATUS_META, getStatus } from "@/lib/deadline-types";

export function StatusBadge({ expiryDate, className }: { expiryDate: string; className?: string }) {
  const meta = STATUS_META[getStatus(expiryDate)];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

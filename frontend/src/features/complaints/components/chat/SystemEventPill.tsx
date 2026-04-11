import { Bell, Undo2, RotateCcw, Timer } from "lucide-react";
import type { ComplaintStatus } from "../../types";
import type { PillKind } from "./types";
import { ComplaintStatusBadge } from "../ComplaintStatusBadge";

interface SystemEventPillProps {
  kind: PillKind;
  label: string;
  notes?: string;
  status?: ComplaintStatus;
}

const PILL_STYLES: Record<PillKind, { border: string; text: string; icon: typeof Bell }> = {
  status: {
    border: "border-transparent",
    text: "text-foreground",
    icon: Bell,
  },
  nudge: {
    border: "border-amber-200",
    text: "text-amber-700",
    icon: Bell,
  },
  return: {
    border: "border-orange-200",
    text: "text-orange-700",
    icon: Undo2,
  },
  reopen: {
    border: "border-blue-200",
    text: "text-blue-700",
    icon: RotateCcw,
  },
  autoclose: {
    border: "border-muted",
    text: "text-muted-foreground",
    icon: Timer,
  },
};

export function SystemEventPill({
  kind,
  label,
  notes,
  status,
}: SystemEventPillProps) {
  const style = PILL_STYLES[kind];
  const Icon = style.icon;
  const isStatusKind = kind === "status" && status;

  return (
    <div className="mx-auto my-3 flex flex-col items-center gap-1">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-xs ${style.border} ${style.text}`}
      >
        {!isStatusKind && <Icon size={12} />}
        {isStatusKind ? (
          <ComplaintStatusBadge status={status} size="sm" />
        ) : (
          <span className={kind === "status" ? "uppercase font-bold" : "capitalize"}>
            {label}
          </span>
        )}
      </div>
      {notes && (
        <p className="text-[11px] text-muted-foreground text-center max-w-[280px]">
          {notes}
        </p>
      )}
    </div>
  );
}
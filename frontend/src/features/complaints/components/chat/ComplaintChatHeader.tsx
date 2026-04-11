import { ComplaintStatusBadge } from "../ComplaintStatusBadge";
import type { ComplaintDetail } from "../../types";
import type { ChatVariant } from "./types";
import { formatDateTime } from "@/shared/utils/helpers";

interface ComplaintChatHeaderProps {
  complaint: ComplaintDetail;
  variant: ChatVariant;
}

export function ComplaintChatHeader({ complaint, variant }: ComplaintChatHeaderProps) {
  const { status, category, sector, responseDueAt, resolutionDueAt } = complaint;
  const showResponseDue = !!responseDueAt;
  const showResolutionDue = !!resolutionDueAt;

  return (
    <div className="border-b bg-background/95 backdrop-blur px-3 py-2 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <ComplaintStatusBadge status={status} size="md" />
        <span className="text-sm font-medium text-foreground">
          {category}
        </span>
        {sector && (
          <span className="text-xs text-muted-foreground">
            · {sector.name}
          </span>
        )}
      </div>
      {(showResponseDue || showResolutionDue) && (
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
          {showResponseDue && (
            <span>Resposta: {formatDateTime(responseDueAt)}</span>
          )}
          {showResolutionDue && (
            <span>Resolução: {formatDateTime(resolutionDueAt)}</span>
          )}
        </div>
      )}
    </div>
  );
}
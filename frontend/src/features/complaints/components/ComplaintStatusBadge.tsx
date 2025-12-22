import {
  AlertTriangle,
  Clock,
  CheckCircle,
  PauseCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplaintStatus } from "@/features/complaints/types";

interface ComplaintStatusBadgeProps {
  status: ComplaintStatus;
  size?: "sm" | "md" | "lg";
}

const STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; icon: typeof AlertTriangle; className: string }
> = {
  NEW: {
    label: "Novo",
    icon: AlertTriangle,
    className: "bg-red-50 text-red-700 border-red-100",
  },
  TRIAGE: {
    label: "Triagem",
    icon: Clock,
    className: "bg-yellow-50 text-yellow-700 border-yellow-100",
  },
  IN_PROGRESS: {
    label: "Em atendimento",
    icon: Clock,
    className: "bg-blue-50 text-blue-700 border-blue-100",
  },
  WAITING_USER: {
    label: "Aguardando usuário",
    icon: PauseCircle,
    className: "bg-amber-50 text-amber-700 border-amber-100",
  },
  WAITING_THIRD_PARTY: {
    label: "Aguardando terceiro",
    icon: PauseCircle,
    className: "bg-amber-50 text-amber-700 border-amber-100",
  },
  RESOLVED: {
    label: "Resolvido",
    icon: CheckCircle,
    className: "bg-green-50 text-green-700 border-green-100",
  },
  CLOSED: {
    label: "Encerrado",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  CANCELLED: {
    label: "Cancelado",
    icon: XCircle,
    className: "bg-gray-50 text-gray-700 border-gray-100",
  },
};

const SIZE_CONFIG = {
  sm: {
    container: "px-2 py-1 text-[10px]",
    icon: 10,
  },
  md: {
    container: "px-3 py-1.5 text-xs",
    icon: 12,
  },
  lg: {
    container: "px-4 py-2 text-sm",
    icon: 14,
  },
} as const;

export const ComplaintStatusBadge = ({
  status,
  size = "md",
}: ComplaintStatusBadgeProps) => {
  const statusConfig = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  if (!statusConfig) {
    console.error("Invalid status:", status);
    return null;
  }

  const Icon = statusConfig.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-bold border uppercase tracking-wide",
        statusConfig.className,
        sizeConfig.container
      )}
    >
      <Icon size={sizeConfig.icon} />
      {statusConfig.label}
    </div>
  );
};

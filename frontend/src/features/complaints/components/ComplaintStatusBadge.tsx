import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplaintStatus } from '@/types';

interface ComplaintStatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG = {
  OPEN: {
    label: 'Em Fila',
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border-red-100',
  },
  IN_PROGRESS: {
    label: 'Averiguando',
    icon: Clock,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  },
  RESOLVED: {
    label: 'Resolvido',
    icon: CheckCircle,
    className: 'bg-green-50 text-green-700 border-green-100',
  },
} as const;

const SIZE_CONFIG = {
  sm: {
    container: 'px-2 py-1 text-[10px]',
    icon: 10,
  },
  md: {
    container: 'px-3 py-1.5 text-xs',
    icon: 12,
  },
  lg: {
    container: 'px-4 py-2 text-sm',
    icon: 14,
  },
} as const;

export const ComplaintStatusBadge = ({ status, size = 'md' }: ComplaintStatusBadgeProps) => {
  const statusConfig = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];
  
  if (!statusConfig) {
    console.error('Invalid status:', status);
    return null;
  }
  
  const Icon = statusConfig.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full font-bold border uppercase tracking-wide',
        statusConfig.className,
        sizeConfig.container
      )}
    >
      <Icon size={sizeConfig.icon} />
      {statusConfig.label}
    </div>
  );
};



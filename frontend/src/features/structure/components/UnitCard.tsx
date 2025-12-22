import { Home, User, Phone, Crown } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import type { Resident } from '@/features/residents/types';

interface UnitCardProps {
  resident: Resident;
  towerName: string;
  floorNumber: string;
}

export function UnitCard({ resident, towerName, floorNumber }: UnitCardProps) {
  const isOwner = resident.type === 'OWNER';

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors">
      {/* Unit Icon */}
      <div className="flex-shrink-0 p-2 rounded-md bg-primary/10">
        <Home className="h-4 w-4 text-primary" />
      </div>

      {/* Unit Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-semibold text-foreground">
            Apto {resident.unit}
          </span>
          {isOwner && (
            <Crown className="h-3 w-3 text-amber-500" title="Proprietário" />
          )}
        </div>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="truncate">{resident.name}</span>
        </div>
        
        {resident.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Phone className="h-3 w-3" />
            <span className="font-mono">{resident.phone}</span>
          </div>
        )}
      </div>

      {/* Type Badge */}
      <Badge 
        variant={isOwner ? "default" : "secondary"}
        className="text-xs flex-shrink-0"
      >
        {isOwner ? 'Proprietário' : 'Inquilino'}
      </Badge>
    </div>
  );
}


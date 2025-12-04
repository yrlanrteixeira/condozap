import { User, Phone, Building2, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Resident } from '@/types';

interface ResidentCardProps {
  resident: Resident;
  onClick?: (resident: Resident) => void;
}

export const ResidentCard = ({ resident, onClick }: ResidentCardProps) => {
  return (
    <Card
      className={`hover:shadow-md transition ${onClick ? 'cursor-pointer' : ''}`}
      onClick={() => onClick?.(resident)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-muted-foreground" />
            <h3 className="font-semibold text-foreground">{resident.name}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {resident.type === 'OWNER' ? 'Proprietário' : 'Inquilino'}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone size={14} />
            <span className="font-mono">{resident.phone}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 size={14} />
            <span>Torre {resident.tower}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin size={14} />
            <span>
              Andar {resident.floor} - Unidade {resident.unit}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


import { Layers } from 'lucide-react';
import { UnitCard } from './UnitCard';
import type { Resident } from '@/features/residents/types';

interface FloorSectionProps {
  floorNumber: string;
  towerName: string;
  residents: Resident[];
}

export function FloorSection({ floorNumber, towerName, residents }: FloorSectionProps) {
  // Sort units by unit number
  const sortedResidents = [...residents].sort((a, b) => {
    const numA = parseInt(a.unit) || 0;
    const numB = parseInt(b.unit) || 0;
    return numA - numB;
  });

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      {/* Floor Header */}
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">
          {floorNumber}º Andar
        </span>
        <span className="text-xs text-muted-foreground">
          ({residents.length} {residents.length === 1 ? 'unidade' : 'unidades'})
        </span>
      </div>

      {/* Units Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sortedResidents.map((resident) => (
          <UnitCard
            key={resident.id}
            resident={resident}
            towerName={towerName}
            floorNumber={floorNumber}
          />
        ))}
      </div>
    </div>
  );
}


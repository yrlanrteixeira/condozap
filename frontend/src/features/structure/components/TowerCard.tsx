import { useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { FloorSection } from './FloorSection';
import type { Resident } from '@/features/residents/types';
import { formatTowerHeading } from '../utils/towerDisplay';

interface TowerCardProps {
  towerName: string;
  residents: Resident[];
}

export function TowerCard({ towerName, residents }: TowerCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Group residents by floor
  const residentsByFloor = residents.reduce((acc, resident) => {
    if (!acc[resident.floor]) {
      acc[resident.floor] = [];
    }
    acc[resident.floor].push(resident);
    return acc;
  }, {} as Record<string, Resident[]>);

  // Sort floors numerically
  const floors = Object.keys(residentsByFloor).sort((a, b) => {
    const numA = parseInt(a) || 0;
    const numB = parseInt(b) || 0;
    return numB - numA; // Descending order
  });

  const totalUnits = residents.length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl text-foreground truncate">
                {formatTowerHeading(towerName)}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {totalUnits} {totalUnits === 1 ? 'unidade' : 'unidades'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {floors.length} {floors.length === 1 ? 'andar' : 'andares'}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {floors.map((floor) => (
              <FloorSection
                key={floor}
                floorNumber={floor}
                towerName={towerName}
                residents={residentsByFloor[floor]}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}


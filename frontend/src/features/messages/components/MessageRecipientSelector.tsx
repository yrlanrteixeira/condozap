import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppSelector } from '@/hooks';
import { selectCurrentCondominiumId } from '@/store/slices/condominiumSlice';
import { useTowers } from '@/features/residents/hooks/useResidentsApi';

type Scope = 'unit' | 'floor' | 'tower' | 'all';

interface MessageRecipientSelectorProps {
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
  selectedTower: string;
  onTowerChange: (tower: string) => void;
  selectedFloor: string;
  onFloorChange: (floor: string) => void;
  selectedUnit: string;
  onUnitChange: (unit: string) => void;
}

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: 'unit', label: 'Unidade Específica' },
  { value: 'floor', label: 'Andar Inteiro' },
  { value: 'tower', label: 'Torre Inteira' },
  { value: 'all', label: 'Todo o Condomínio' },
];

export const MessageRecipientSelector = ({
  scope,
  onScopeChange,
  selectedTower,
  onTowerChange,
  selectedFloor,
  onFloorChange,
  selectedUnit,
  onUnitChange,
}: MessageRecipientSelectorProps) => {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { data: towers = [] } = useTowers(currentCondominiumId || "");
  return (
    <div>
      <label htmlFor="scope-select" className="block text-sm font-medium text-foreground mb-2">
        1. Destinatário
      </label>
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-4">
        {SCOPE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={scope === option.value ? 'default' : 'outline'}
            onClick={() => onScopeChange(option.value)}
            size="sm"
            className="text-xs sm:text-sm"
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {(scope === 'unit' || scope === 'floor' || scope === 'tower') && (
          <Select value={selectedTower} onValueChange={onTowerChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione Torre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" disabled hidden>
                Selecione uma torre
              </SelectItem>
              {towers.length > 0 ? (
                towers.map((tower) => (
                  <SelectItem key={tower} value={tower}>
                    Torre {tower}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="A">Torre A</SelectItem>
                  <SelectItem value="B">Torre B</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        )}
        {(scope === 'unit' || scope === 'floor') && (
          <Input
            placeholder="Andar (ex: 1)"
            value={selectedFloor}
            onChange={(e) => onFloorChange(e.target.value)}
          />
        )}
        {scope === 'unit' && (
          <Input
            placeholder="Unidade (ex: 101)"
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
};


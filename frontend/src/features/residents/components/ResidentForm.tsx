import { User, Phone, Building2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/hooks";
import { selectCurrentCondominiumId } from "@/store/slices/condominiumSlice";
import { useTowers } from "../hooks/useResidentsApi";

export interface ResidentFormData {
  name: string;
  phone: string;
  tower: string;
  floor: string;
  unit: string;
}

interface ResidentFormProps {
  formData: ResidentFormData;
  onChange: (formData: ResidentFormData) => void;
}

export const ResidentForm = ({ formData, onChange }: ResidentFormProps) => {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { data: towers = [] } = useTowers(currentCondominiumId || "");
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="text-sm font-medium flex items-center gap-2"
        >
          <User size={14} />
          Nome Completo
        </label>
        <Input
          id="name"
          placeholder="Ex: João Silva"
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="phone"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Phone size={14} />
          Telefone
        </label>
        <Input
          id="phone"
          placeholder="Ex: (11) 99999-9999"
          value={formData.phone}
          onChange={(e) => onChange({ ...formData, phone: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="tower"
            className="text-sm font-medium flex items-center gap-2"
          >
            <Building2 size={14} />
            Torre
          </label>
          <Select
            value={formData.tower}
            onValueChange={(value) => onChange({ ...formData, tower: value })}
          >
            <SelectTrigger id="tower">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
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
                  <SelectItem value="C">Torre C</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="floor"
            className="text-sm font-medium flex items-center gap-2"
          >
            <MapPin size={14} />
            Andar
          </label>
          <Input
            id="floor"
            placeholder="Ex: 5"
            value={formData.floor}
            onChange={(e) => onChange({ ...formData, floor: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="unit"
            className="text-sm font-medium flex items-center gap-2"
          >
            <MapPin size={14} />
            Unidade
          </label>
          <Input
            id="unit"
            placeholder="Ex: 501"
            value={formData.unit}
            onChange={(e) => onChange({ ...formData, unit: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};

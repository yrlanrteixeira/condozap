import { User, Phone, Building2, MapPin, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/hooks";
import { selectCurrentCondominiumId, selectCondominiums } from "@/store/slices/condominiumSlice";
import { useTowers } from "../hooks/useResidentsApi";
import { useCondominiums } from "@/features/condominiums/hooks/useCondominiumsApi";

export interface ResidentFormData {
  name: string;
  email: string;
  phone: string;
  tower: string;
  floor: string;
  unit: string;
  condominiumId?: string;
}

interface ResidentFormProps {
  formData: ResidentFormData;
  onChange: (formData: ResidentFormData) => void;
}

export const ResidentForm = ({ formData, onChange }: ResidentFormProps) => {
  const { user } = useAuth();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const userCondominiums = useAppSelector(selectCondominiums);
  const { data: allCondominiums = [] } = useCondominiums();
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const condominiumsToShow = isSuperAdmin ? allCondominiums : userCondominiums;
  const selectedCondoId = formData.condominiumId || currentCondominiumId || "";
  
  const { data: towers = [] } = useTowers(selectedCondoId);
  
  return (
    <div className="space-y-4 py-4">
      {/* Condomínio - Apenas para SUPER_ADMIN */}
      {isSuperAdmin && condominiumsToShow.length > 0 && (
        <div className="space-y-2">
          <label
            htmlFor="condominium"
            className="text-sm font-medium flex items-center gap-2"
          >
            <Building2 size={14} />
            Condomínio
          </label>
          <Select
            value={formData.condominiumId || currentCondominiumId || ""}
            onValueChange={(value) => onChange({ ...formData, condominiumId: value })}
          >
            <SelectTrigger id="condominium">
              <SelectValue placeholder="Selecione um condomínio" />
            </SelectTrigger>
            <SelectContent>
              {condominiumsToShow.map((condo) => (
                <SelectItem key={condo.id} value={condo.id}>
                  {condo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
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
          htmlFor="email"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Mail size={14} />
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="Ex: joao@email.com"
          value={formData.email}
          onChange={(e) => onChange({ ...formData, email: e.target.value })}
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

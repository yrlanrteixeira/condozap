import { useState, useEffect, useMemo } from "react";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Search } from "lucide-react";
import type { Resident } from "../types";
import { useStructure } from "@/features/structure/hooks/useStructureApi";
import { useAppSelector } from "@/shared/hooks";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";

interface ResidentsFilterBarProps {
  residents: Resident[];
  onFilteredChange: (filtered: Resident[]) => void;
}

export function ResidentsFilterBar({
  residents,
  onFilteredChange,
}: ResidentsFilterBarProps) {
  const condominiumId = useAppSelector(selectCurrentCondominiumId);
  const { data: structureData } = useStructure(condominiumId || "");

  const [search, setSearch] = useState("");
  const [tower, setTower] = useState("all");
  const [floor, setFloor] = useState("all");
  const [type, setType] = useState("all");

  // Derive tower options from structure + residents
  const towers = useMemo(() => {
    const set = new Set<string>();
    if (structureData?.structure?.towers) {
      structureData.structure.towers.forEach((t) => set.add(t.name));
    }
    residents.forEach((r) => set.add(r.tower));
    return Array.from(set).sort();
  }, [structureData, residents]);

  // Derive floor options filtered by selected tower
  const floors = useMemo(() => {
    const source =
      tower === "all" ? residents : residents.filter((r) => r.tower === tower);
    const set = new Set<string>();
    source.forEach((r) => set.add(r.floor));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [residents, tower]);

  // Reset floor when tower changes
  useEffect(() => {
    setFloor("all");
  }, [tower]);

  // Apply filters with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = residents;
      const searchLower = search.toLowerCase();

      if (searchLower) {
        filtered = filtered.filter(
          (r) =>
            r.name.toLowerCase().includes(searchLower) ||
            r.email.toLowerCase().includes(searchLower) ||
            r.phone.includes(search)
        );
      }

      if (tower !== "all") {
        filtered = filtered.filter((r) => r.tower === tower);
      }

      if (floor !== "all") {
        filtered = filtered.filter((r) => r.floor === floor);
      }

      if (type !== "all") {
        filtered = filtered.filter((r) => r.type === type);
      }

      onFilteredChange(filtered);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, tower, floor, type, residents, onFilteredChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={tower} onValueChange={setTower}>
        <SelectTrigger className="w-full sm:w-[130px]">
          <SelectValue placeholder="Torre" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas torres</SelectItem>
          {towers.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={floor} onValueChange={setFloor}>
        <SelectTrigger className="w-full sm:w-[130px]">
          <SelectValue placeholder="Andar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos andares</SelectItem>
          {floors.map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos tipos</SelectItem>
          <SelectItem value="OWNER">Proprietário</SelectItem>
          <SelectItem value="TENANT">Inquilino</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

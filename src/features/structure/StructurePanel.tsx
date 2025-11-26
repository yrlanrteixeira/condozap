import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Building2, User, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationTable } from "@/components/ui/pagination-table";
import type { Resident } from "@/types";
import { createResident, updateResident } from "@/services/residentService";
import { useApp } from "@/contexts";

interface StructurePanelProps {
  residents: Resident[];
  onResidentsChange?: () => void;
}

export function StructurePanel({
  residents,
  onResidentsChange,
}: StructurePanelProps) {
  const { currentCondominiumId } = useApp();
  const [localResidents, setLocalResidents] = useState<Resident[]>(residents);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setLocalResidents(residents);
    // Resetar para a primeira página quando os residentes mudarem
    setCurrentPage(1);
  }, [residents]);

  // Calcular itens paginados
  const paginatedResidents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return localResidents.slice(startIndex, endIndex);
  }, [localResidents, currentPage]);

  const totalPages = Math.ceil(localResidents.length / itemsPerPage);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    tower: "A",
    floor: "",
    unit: "",
  });

  const handleOpenAdd = () => {
    setEditingResident(null);
    setFormData({
      name: "",
      phone: "",
      tower: "A",
      floor: "",
      unit: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (resident: Resident) => {
    setEditingResident(resident);
    setFormData({
      name: resident.name,
      phone: resident.phone,
      tower: resident.tower,
      floor: resident.floor,
      unit: resident.unit,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (
      !formData.name ||
      !formData.phone ||
      !formData.floor ||
      !formData.unit
    ) {
      return;
    }

    try {
      if (editingResident) {
        const updated = updateResident(editingResident.id, {
          ...formData,
          condominiumId: editingResident.condominiumId,
        });
        setLocalResidents((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      } else {
        if (!currentCondominiumId) return;
        const newResident = createResident({
          name: formData.name,
          phone: formData.phone,
          tower: formData.tower,
          floor: formData.floor,
          unit: formData.unit,
        });
        // Adicionar condominiumId
        const residentWithCondo: Resident = {
          ...newResident,
          condominiumId: currentCondominiumId,
        };
        setLocalResidents((prev) => {
          const updated = [...prev, residentWithCondo];
          // Calcular a nova página total e ir para a última página se necessário
          const prevTotalPages = Math.ceil(prev.length / itemsPerPage);
          const newTotalPages = Math.ceil(updated.length / itemsPerPage);
          if (newTotalPages > prevTotalPages) {
            setCurrentPage(newTotalPages);
          }
          return updated;
        });
      }
      setIsDialogOpen(false);
      onResidentsChange?.();
      // Forçar re-render do componente pai
      window.dispatchEvent(new CustomEvent("residents-updated"));
    } catch (error) {
      console.error("Erro ao salvar morador:", error);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Estrutura do Condomínio
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Gerencie os moradores e suas unidades
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Moradores</h3>
          <Button
            onClick={handleOpenAdd}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} />
            Adicionar Novo Morador
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Nome</TableHead>
                <TableHead className="font-bold">Telefone</TableHead>
                <TableHead className="font-bold">Torre</TableHead>
                <TableHead className="font-bold">Andar</TableHead>
                <TableHead className="font-bold">Unidade</TableHead>
                <TableHead className="font-bold w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localResidents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum morador cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedResidents.map((resident) => (
                  <TableRow key={resident.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {resident.name}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {resident.phone}
                    </TableCell>
                    <TableCell className="text-sm">{resident.tower}</TableCell>
                    <TableCell className="text-sm">{resident.floor}</TableCell>
                    <TableCell className="text-sm">{resident.unit}</TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-primary p-0 h-auto"
                        onClick={() => handleOpenEdit(resident)}
                      >
                        <Pencil size={14} className="mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {localResidents.length > 0 && (
          <div className="p-4 border-t border-border">
            <PaginationTable
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={localResidents.length}
              showInfo={true}
            />
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="flex flex-col space-y-1.5 text-center sm:text-left">
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
              {editingResident ? "Editar Morador" : "Adicionar Novo Morador"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editingResident
                ? "Atualize as informações do morador"
                : "Preencha os dados para adicionar um novo morador ao condomínio"}
            </DialogDescription>
          </DialogHeader>

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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, tower: value })
                  }
                >
                  <SelectTrigger id="tower">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Torre A</SelectItem>
                    <SelectItem value="B">Torre B</SelectItem>
                    <SelectItem value="C">Torre C</SelectItem>
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
                  onChange={(e) =>
                    setFormData({ ...formData, floor: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.name ||
                !formData.phone ||
                !formData.floor ||
                !formData.unit
              }
            >
              {editingResident ? "Salvar Alterações" : "Adicionar Morador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

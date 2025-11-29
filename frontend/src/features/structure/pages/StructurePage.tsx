import { useState, useEffect, useMemo } from "react";
import { PaginationTable } from "@/components/ui/pagination-table";
import type { Resident } from "@/types";
import { createResident, updateResident } from "@/services/residentService";
import { useApp } from "@/contexts";
import {
  ResidentPageHeader,
  ResidentTableHeader,
  ResidentTable,
  ResidentDialog,
  type ResidentFormData,
} from "@/features/residents";

interface StructurePageProps {
  residents: Resident[];
  onResidentsChange?: () => void;
}

export function StructurePage({
  residents,
  onResidentsChange,
}: StructurePageProps) {
  const { currentCondominiumId } = useApp();
  const [localResidents, setLocalResidents] = useState<Resident[]>(residents);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setLocalResidents(residents);
    setCurrentPage(1);
  }, [residents]);

  const paginatedResidents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return localResidents.slice(startIndex, endIndex);
  }, [localResidents, currentPage]);

  const totalPages = Math.ceil(localResidents.length / itemsPerPage);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [formData, setFormData] = useState<ResidentFormData>({
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
        const residentWithCondo: Resident = {
          ...newResident,
          condominiumId: currentCondominiumId,
        };
        setLocalResidents((prev) => {
          const updated = [...prev, residentWithCondo];
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
      window.dispatchEvent(new CustomEvent("residents-updated"));
    } catch (error) {
      console.error("Erro ao salvar morador:", error);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <ResidentPageHeader />

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <ResidentTableHeader onAddNew={handleOpenAdd} />

        <ResidentTable residents={paginatedResidents} onEdit={handleOpenEdit} />

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

      <ResidentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingResident={editingResident}
        formData={formData}
        onFormChange={setFormData}
        onSave={handleSave}
      />
    </div>
  );
}

export default StructurePage;

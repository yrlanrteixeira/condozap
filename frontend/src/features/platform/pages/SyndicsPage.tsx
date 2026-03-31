import { useState } from "react";
import { Users, Mail, Building2, Plus, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { CardSkeleton } from "@/shared/components/ui/skeleton";
import { useSyndics } from "../hooks/useSyndicsApi";
import { CreateSyndicDialog } from "@/features/user-management/components/CreateSyndicDialog";
import { EditSyndicDialog } from "@/features/user-management/components/EditSyndicDialog";
import type { Syndic } from "../hooks/useSyndicsApi";

const roleLabelMap: Record<string, { label: string; className: string }> = {
  SYNDIC: {
    label: "Síndico",
    className: "bg-info/10 text-info border-info/20",
  },
  PROFESSIONAL_SYNDIC: {
    label: "Síndico Profissional",
    className: "bg-primary/10 text-primary border-primary/20",
  },
};

function getRoleDisplay(role: string) {
  return (
    roleLabelMap[role] ?? {
      label: role,
      className: "bg-secondary text-secondary-foreground",
    }
  );
}

export function SyndicsPage() {
  const { data: syndics, isLoading, isError, refetch } = useSyndics();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSyndic, setEditingSyndic] = useState<Syndic | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="space-y-1">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full p-4 sm:p-6">
        <Card className="p-6">
          <CardContent>
            <p className="text-muted-foreground">
              Erro ao carregar os síndicos. Tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasSyndics = syndics && syndics.length > 0;

  const openEdit = (syndic: Syndic) => {
    setEditingSyndic(syndic);
    setEditOpen(true);
  };

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open);
    if (!open) setEditingSyndic(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <CreateSyndicDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
      />
      <EditSyndicDialog
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        syndic={editingSyndic}
        onSuccess={() => refetch()}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Síndicos</h1>
          <p className="text-muted-foreground">
            Lista de todos os síndicos cadastrados na plataforma e os condomínios que gerenciam
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo síndico
        </Button>
      </div>

      {/* Empty State */}
      {!hasSyndics && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-muted rounded-full mb-4">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Nenhum síndico encontrado</h2>
          <p className="text-muted-foreground max-w-sm mb-4">
            Ainda não há síndicos cadastrados na plataforma.
          </p>
          <Button onClick={() => setCreateOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar primeiro síndico
          </Button>
        </div>
      )}

      {/* Syndics Grid */}
      {hasSyndics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {syndics.map((syndic) => {
            const roleDisplay = getRoleDisplay(syndic.role);
            return (
              <Card key={syndic.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-foreground leading-tight">
                      {syndic.name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(syndic)}
                        aria-label={`Editar ${syndic.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Badge
                        variant="outline"
                        className={roleDisplay.className}
                      >
                        {roleDisplay.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-0">
                  {/* Email */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{syndic.email}</span>
                  </div>

                  {/* Condominiums */}
                  {syndic.condominiums.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Condomínios</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {syndic.condominiums.map((sc) => (
                          <Badge
                            key={sc.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {sc.condominium.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="italic">Sem condomínios vinculados</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SyndicsPage;

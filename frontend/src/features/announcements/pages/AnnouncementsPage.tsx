import { useState } from "react";
import { Megaphone, Plus, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useToast } from "@/shared/components/ui/use-toast";
import { useAppSelector } from "@/shared/hooks";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { useRole } from "@/shared/hooks/useRole";
import { Permissions } from "@/config/permissions";
import {
  useAnnouncements,
  useDeleteAnnouncement,
  type Announcement,
} from "../hooks/useAnnouncementsApi";
import { CreateAnnouncementDialog } from "../components/CreateAnnouncementDialog";

const SCOPE_LABELS: Record<string, string> = {
  ALL: "Geral",
  TOWER: "Torre",
  FLOOR: "Andar",
  UNIT: "Unidade",
};

const SCOPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  ALL: "default",
  TOWER: "secondary",
  FLOOR: "secondary",
  UNIT: "secondary",
};

function AnnouncementCardSkeleton() {
  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getScopeDescription(announcement: Announcement): string | null {
  const { scope, targetTower, targetFloor, targetUnit } = announcement;
  if (scope === "TOWER" && targetTower) return `Torre ${targetTower}`;
  if (scope === "FLOOR" && targetFloor) return `Andar ${targetFloor}`;
  if (scope === "UNIT" && targetUnit) return `Unidade ${targetUnit}`;
  return null;
}

export default function AnnouncementsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { can } = useRole();

  const condominiumId = useAppSelector(selectCurrentCondominiumId) ?? "";
  const canCreate = can(Permissions.CREATE_ANNOUNCEMENT);

  const { data, isLoading } = useAnnouncements(condominiumId);
  const deleteAnnouncement = useDeleteAnnouncement();

  const announcements: Announcement[] = data?.announcements ?? [];

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement.mutateAsync(id);
      toast({
        title: "Comunicado removido",
        description: "O comunicado foi removido com sucesso.",
        variant: "success",
        duration: 3000,
      });
    } catch {
      toast({
        title: "Erro ao remover",
        description: "Nao foi possivel remover o comunicado. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Comunicados
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os avisos e comunicados do condomínio
            </p>
          </div>
        </div>

        {canCreate && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Comunicado
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <AnnouncementCardSkeleton key={i} />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Nenhum comunicado publicado
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {canCreate
              ? 'Clique em "Novo Comunicado" para publicar o primeiro aviso para os moradores.'
              : "Ainda não há comunicados publicados para este condomínio."}
          </p>
        </div>
      ) : (
        /* Announcement list */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((ann) => {
            const scopeDescription = getScopeDescription(ann);
            return (
              <Card
                key={ann.id}
                className="border-border hover:shadow-sm transition-shadow"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground leading-snug line-clamp-2 flex-1">
                      {ann.title}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={SCOPE_VARIANTS[ann.scope] ?? "secondary"}
                        className="text-xs"
                      >
                        {SCOPE_LABELS[ann.scope] ?? ann.scope}
                        {scopeDescription ? ` — ${scopeDescription}` : ""}
                      </Badge>
                    </div>
                  </div>

                  {/* Content preview */}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {ann.content}
                  </p>

                  {/* Footer row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ann.sendWhatsApp && (
                        <Badge
                          variant="outline"
                          className="text-xs gap-1 text-green-600 border-green-300 dark:text-green-400 dark:border-green-700"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {ann.authorName ? `${ann.authorName} · ` : ""}
                        {formatDate(ann.createdAt)}
                      </span>
                    </div>

                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDelete(ann.id)}
                        disabled={deleteAnnouncement.isPending}
                        aria-label="Remover comunicado"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      {condominiumId && (
        <CreateAnnouncementDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          condominiumId={condominiumId}
        />
      )}
    </div>
  );
}

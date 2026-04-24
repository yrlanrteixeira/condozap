import { useState, useMemo, useEffect } from "react";
import { Send, Bold, Italic, Strikethrough, List, ListOrdered, Smile, Paperclip, CheckCircle2, AlertCircle, History, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import type { TargetData, MessageType, MessageScope, Message } from "@/features/messages/types";
import type { Condominium } from "@/types";
import { filterResidentsByTarget } from "@/shared/utils/helpers";
import { useResidents } from "@/features/residents/hooks/useResidentsApi";
import { useSendMessage, useMessages } from "../hooks/useMessagesApi";
import { useAppSelector } from "@/shared/hooks";
import { useAuth } from "@/shared/hooks/useAuth";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";

type Scope = "unit" | "floor" | "tower" | "all";

const SCOPE_LABELS: Record<Scope, string> = {
  all: "Todos os Moradores",
  tower: "Torre Inteira",
  floor: "Andar Inteiro",
  unit: "Unidade Específica",
};

function scopeLabel(msg: Message): string {
  if (msg.scope === "ALL") return "Todos os Moradores";
  if (msg.scope === "TOWER") return `Torre ${msg.targetTower ?? ""}`;
  if (msg.scope === "FLOOR") return `Andar ${msg.targetFloor ?? ""}`;
  if (msg.scope === "UNIT") return `Unidade ${msg.targetUnit ?? ""}`;
  return msg.scope;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Agora";
  if (h < 24) return `Hoje, ${new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (h < 48) return "Ontem";
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

// ─── Sidebar: Comunicados Recentes ───────────────────────────────────────────
function RecentBroadcastsSidebar({
  condominiumId,
  onViewAll,
}: {
  condominiumId: string;
  onViewAll: () => void;
}) {
  const { data: messages = [] } = useMessages(condominiumId, { limit: 5 });
  const recent = (messages as Message[]).slice(0, 5);

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Comunicados Recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {recent.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <FileText className="mx-auto h-8 w-8 opacity-40 mb-2" />
            Nenhum comunicado enviado ainda.
          </div>
        ) : (
          recent.map((msg) => {
            const delivered = msg.recipientCount;
            const failed = msg.whatsappStatus === "FAILED" ? msg.recipientCount : 0;

            return (
              <div key={msg.id} className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 hover:bg-muted/60 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-xs font-medium truncate max-w-[60%]">
                    {scopeLabel(msg)}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(msg.sentAt)}
                  </span>
                </div>

                <p className="text-sm text-foreground line-clamp-2 leading-snug">
                  {msg.content}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {delivered} Entregues
                  </span>
                  {failed > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {failed} Falhas
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 gap-2"
          onClick={onViewAll}
        >
          <History className="h-4 w-4" />
          Ver Histórico Completo
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function MessagingPage() {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const condoIdToFetch = currentCondominiumId || "";
  const { data: residents = [], isLoading, isError } = useResidents(condoIdToFetch);
  const sendMessage = useSendMessage();

  const [scope, setScope] = useState<Scope>("all");
  const [selectedTower, setSelectedTower] = useState("");
  const [textContent, setTextContent] = useState("");
  const isSending = sendMessage.isPending;

  const currentUserAssignedTower = user?.condominiums
    ?.find((c: Condominium) => c.id === currentCondominiumId)?.assignedTower;

  useEffect(() => {
    if (currentUserAssignedTower) {
      setSelectedTower(currentUserAssignedTower);
      if (scope === "all") setScope("tower");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserAssignedTower]);

  const recipientCount = useMemo(() => {
    if (!residents || residents.length === 0) return 0;
    const targetData: TargetData = {
      scope: scope.toUpperCase() as TargetData["scope"],
      tower: selectedTower,
      floor: "",
      unit: "",
    };
    const filtered = filterResidentsByTarget(residents, targetData);
    return filtered ? filtered.length : 0;
  }, [scope, selectedTower, residents]);

  const handleSend = async () => {
    if (!currentCondominiumId) {
      toast({ title: "Erro", description: "Nenhum condomínio selecionado.", variant: "error", duration: 3000 });
      return;
    }
    if (!textContent.trim()) {
      toast({ title: "Campo obrigatório", description: "Digite uma mensagem antes de enviar.", variant: "warning", duration: 3000 });
      return;
    }
    try {
      await sendMessage.mutateAsync({
        condominiumId: currentCondominiumId,
        type: "TEXT" as MessageType,
        content: { text: textContent },
        target: {
          scope: scope.toUpperCase() as MessageScope,
          tower: selectedTower || undefined,
        },
        sentBy: user?.id || "",
      });
      toast({ title: "Mensagem enviada!", description: `Enviada para ${recipientCount} morador(es).`, variant: "success", duration: 3000 });
      setTextContent("");
    } catch {
      toast({ title: "Erro ao enviar", description: "Não foi possível enviar a mensagem.", variant: "error", duration: 5000 });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (isError || (!currentCondominiumId && user?.role !== "SUPER_ADMIN")) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="p-6 max-w-sm text-center">
          <CardContent>
            <p className="text-muted-foreground">
              {!currentCondominiumId ? "Selecione um condomínio para enviar mensagens." : "Erro ao carregar moradores."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Novo Comunicado</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enviar uma mensagem de WhatsApp para os moradores
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* ── Left: form ── */}
        <div className="space-y-4">
          {/* Destinatários */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Destinatários</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Enviar Para */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Enviar Para
                  </label>
                  <Select
                    value={scope}
                    onValueChange={(v) => setScope(v as Scope)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(SCOPE_LABELS) as [Scope, string][]).map(([val, label]) => (
                        <SelectItem
                          key={val}
                          value={val}
                          disabled={!!currentUserAssignedTower && val === "all"}
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Torre */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Torre (se aplicável)
                  </label>
                  <Select
                    value={selectedTower || "__none__"}
                    onValueChange={(v) => setSelectedTower(v === "__none__" ? "" : v)}
                    disabled={scope === "all" || !!currentUserAssignedTower}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar Torre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecionar Torre</SelectItem>
                      {["A", "B", "C", "D"].map((t) => (
                        <SelectItem key={t} value={t}>Torre {t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recipient count info */}
              {recipientCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-3 py-2.5 text-sm text-blue-800 dark:text-blue-300">
                  <span className="mt-0.5 flex-shrink-0 text-blue-500">ℹ</span>
                  <span>
                    Esta mensagem será enviada para aproximadamente{" "}
                    <strong>{recipientCount}</strong> moradores.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conteúdo */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Conteúdo da Mensagem</h2>
                <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Usar Modelo
                </Button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-1 border-b border-border pb-2">
                {[
                  { Icon: Bold, label: "Negrito" },
                  { Icon: Italic, label: "Itálico" },
                  { Icon: Strikethrough, label: "Riscado" },
                  null,
                  { Icon: List, label: "Lista" },
                  { Icon: ListOrdered, label: "Lista Numerada" },
                  null,
                  { Icon: Smile, label: "Emoji" },
                  { Icon: Paperclip, label: "Anexo" },
                ].map((item, i) =>
                  item === null ? (
                    <div key={i} className="w-px h-5 bg-border mx-1" />
                  ) : (
                    <button
                      key={item.label}
                      type="button"
                      title={item.label}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <item.Icon className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>

              {/* Textarea */}
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Digite sua mensagem aqui..."
                maxLength={4096}
                rows={8}
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                <span>Variáveis: {"{{name}}"}, {"{{unit}}"}, {"{{condominium}}"}</span>
                <span>{textContent.length} / 4096</span>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button variant="outline" className="sm:flex-1" disabled={isSending}>
                  Salvar Rascunho
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={isSending || !textContent.trim()}
                  className="sm:flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  {isSending ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar Mensagem
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: sidebar ── */}
        {currentCondominiumId && (
          <RecentBroadcastsSidebar
            condominiumId={currentCondominiumId}
            onViewAll={() => navigate("/history")}
          />
        )}
      </div>
    </div>
  );
}

export default MessagingPage;

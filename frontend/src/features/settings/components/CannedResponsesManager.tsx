import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { useAppSelector } from '@/shared/hooks/useAppSelector';
import { selectCurrentCondominiumId } from '@/shared/store/slices/condominiumSlice';
import { useSectors } from '@/features/structure/hooks/useSectorsApi';
import { useToast } from '@/shared/components/ui/use-toast';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  condominiumId: string | null;
  sectorId: string | null;
  sector?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateCannedResponseInput {
  title: string;
  content: string;
  condominiumId: string;
  sectorId?: string | null;
}

interface UpdateCannedResponseInput {
  title?: string;
  content?: string;
  sectorId?: string | null;
}

// ---------------------------------------------------------------------------
// API helpers (using TanStack Query)
// ---------------------------------------------------------------------------

function useCannedResponses(condominiumId: string) {
  return useQuery<CannedResponse[]>({
    queryKey: ['canned-responses', condominiumId],
    queryFn: async () => {
      const { data } = await api.get<CannedResponse[]>(
        `/canned-responses?condominiumId=${condominiumId}`
      );
      return data;
    },
    enabled: !!condominiumId,
  });
}

function useCreateCannedResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCannedResponseInput): Promise<CannedResponse> => {
      const { data } = await api.post<CannedResponse>('/canned-responses', input);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['canned-responses', data.condominiumId ?? ''],
      });
      // Also invalidate in case condominiumId is null (global)
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
    },
  });
}

function useUpdateCannedResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateCannedResponseInput & { id: string }): Promise<CannedResponse> => {
      const { data } = await api.patch<CannedResponse>(`/canned-responses/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
    },
  });
}

function useDeleteCannedResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/canned-responses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const NO_SECTOR_VALUE = '__none__';

interface ResponseFormState {
  title: string;
  content: string;
  sectorId: string;
}

interface CreateFormProps {
  condominiumId: string;
  sectors: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

function CreateForm({ condominiumId, sectors, onSuccess }: CreateFormProps) {
  const { toast } = useToast();
  const createMutation = useCreateCannedResponse();

  const [form, setForm] = useState<ResponseFormState>({
    title: '',
    content: '',
    sectorId: NO_SECTOR_VALUE,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    try {
      await createMutation.mutateAsync({
        title: form.title.trim(),
        content: form.content.trim(),
        condominiumId,
        sectorId: form.sectorId !== NO_SECTOR_VALUE ? form.sectorId : null,
      });
      toast({
        title: 'Resposta criada',
        description: 'O modelo de resposta foi salvo com sucesso.',
      });
      setForm({ title: '', content: '', sectorId: NO_SECTOR_VALUE });
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao criar modelo de resposta.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="cr-title">Titulo</Label>
        <Input
          id="cr-title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Ex: Resposta para atraso de boleto"
          required
          minLength={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cr-content">Conteudo</Label>
        <Textarea
          id="cr-content"
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder="Texto da resposta padrao..."
          rows={3}
          required
          minLength={5}
        />
      </div>

      {sectors.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="cr-sector">Setor (opcional)</Label>
          <Select
            value={form.sectorId}
            onValueChange={(val) => setForm((f) => ({ ...f, sectorId: val }))}
          >
            <SelectTrigger id="cr-sector">
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SECTOR_VALUE}>Todos os setores</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" disabled={createMutation.isPending} size="sm">
        {createMutation.isPending ? 'Salvando...' : 'Adicionar modelo'}
      </Button>
    </form>
  );
}

interface EditDialogProps {
  response: CannedResponse;
  sectors: Array<{ id: string; name: string }>;
  onClose: () => void;
}

function EditDialog({ response, sectors, onClose }: EditDialogProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateCannedResponse();

  const [form, setForm] = useState<ResponseFormState>({
    title: response.title,
    content: response.content,
    sectorId: response.sectorId ?? NO_SECTOR_VALUE,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    try {
      await updateMutation.mutateAsync({
        id: response.id,
        title: form.title.trim(),
        content: form.content.trim(),
        sectorId: form.sectorId !== NO_SECTOR_VALUE ? form.sectorId : null,
      });
      toast({
        title: 'Modelo atualizado',
        description: 'O modelo de resposta foi atualizado com sucesso.',
      });
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao atualizar modelo.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar modelo de resposta</DialogTitle>
          <DialogDescription>
            Altere o titulo, conteudo ou setor do modelo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-cr-title">Titulo</Label>
            <Input
              id="edit-cr-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              minLength={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-cr-content">Conteudo</Label>
            <Textarea
              id="edit-cr-content"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
              required
              minLength={5}
            />
          </div>

          {sectors.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-cr-sector">Setor (opcional)</Label>
              <Select
                value={form.sectorId}
                onValueChange={(val) => setForm((f) => ({ ...f, sectorId: val }))}
              >
                <SelectTrigger id="edit-cr-sector">
                  <SelectValue placeholder="Todos os setores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SECTOR_VALUE}>Todos os setores</SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar alteracoes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  response: CannedResponse;
  onClose: () => void;
}

function DeleteDialog({ response, onClose }: DeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteCannedResponse();

  const handleConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(response.id);
      toast({
        title: 'Modelo removido',
        description: 'O modelo de resposta foi excluido.',
      });
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao excluir modelo.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir modelo de resposta</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o modelo{' '}
            <strong>&ldquo;{response.title}&rdquo;</strong>? Esta acao nao pode
            ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Badge helper
// ---------------------------------------------------------------------------

function ScopeBadge({ response }: { response: CannedResponse }) {
  if (response.condominiumId === null) {
    return (
      <Badge className="bg-blue-600 text-white hover:bg-blue-600 border-transparent text-xs">
        Global
      </Badge>
    );
  }
  if (response.sectorId) {
    const sectorName = response.sector?.name ?? 'Setor';
    return (
      <Badge variant="secondary" className="text-xs">
        {sectorName}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      Condominio
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Response row
// ---------------------------------------------------------------------------

interface ResponseRowProps {
  response: CannedResponse;
  sectors: Array<{ id: string; name: string }>;
}

function ResponseRow({ response, sectors }: ResponseRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isGlobal = response.condominiumId === null;

  return (
    <>
      <div className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium leading-tight">{response.title}</span>
            <ScopeBadge response={response} />
            {isGlobal && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Somente leitura
              </Badge>
            )}
          </div>
          <p className="line-clamp-2 text-muted-foreground">{response.content}</p>
        </div>

        {!isGlobal && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditOpen(true)}
              aria-label={`Editar "${response.title}"`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              aria-label={`Excluir "${response.title}"`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {editOpen && (
        <EditDialog
          response={response}
          sectors={sectors}
          onClose={() => setEditOpen(false)}
        />
      )}
      {deleteOpen && (
        <DeleteDialog response={response} onClose={() => setDeleteOpen(false)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CannedResponsesManager() {
  const { toast } = useToast();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const condoId = currentCondominiumId ?? '';

  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: responses = [], isLoading, error } = useCannedResponses(condoId);
  const { data: sectors = [] } = useSectors(condoId);

  if (!condoId) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            Respostas Padrao
          </CardTitle>
          <CardDescription>Nenhum condominio selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione um condominio no menu acima para gerenciar os modelos de
            resposta.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao carregar modelos.';
    toast({ title: 'Erro', description: message, variant: 'destructive' });
  }

  // Group responses
  const globalResponses = responses.filter((r) => r.condominiumId === null);
  const condominiumResponses = responses.filter(
    (r) => r.condominiumId !== null && !r.sectorId
  );
  const sectorResponses = responses.filter(
    (r) => r.condominiumId !== null && !!r.sectorId
  );

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              Respostas Padrao
            </CardTitle>
            <CardDescription className="mt-1">
              Gerencie modelos de resposta para agilizar o atendimento
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant={showCreateForm ? 'outline' : 'default'}
            onClick={() => setShowCreateForm((v) => !v)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {showCreateForm ? 'Cancelar' : 'Novo modelo'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Create form */}
        {showCreateForm && (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Novo modelo de resposta</p>
            <CreateForm
              condominiumId={condoId}
              sectors={sectors}
              onSuccess={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando modelos...</p>
        )}

        {/* Empty state */}
        {!isLoading && responses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum modelo de resposta cadastrado. Crie o primeiro clicando em
            &ldquo;Novo modelo&rdquo;.
          </p>
        )}

        {/* Global section */}
        {globalResponses.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Globais
            </p>
            {globalResponses.map((r) => (
              <ResponseRow key={r.id} response={r} sectors={sectors} />
            ))}
          </section>
        )}

        {/* Condominium section */}
        {condominiumResponses.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Do condominio
            </p>
            {condominiumResponses.map((r) => (
              <ResponseRow key={r.id} response={r} sectors={sectors} />
            ))}
          </section>
        )}

        {/* Sector-specific section */}
        {sectorResponses.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Por setor
            </p>
            {sectorResponses.map((r) => (
              <ResponseRow key={r.id} response={r} sectors={sectors} />
            ))}
          </section>
        )}
      </CardContent>
    </Card>
  );
}

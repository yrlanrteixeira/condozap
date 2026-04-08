import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  useAllPlans,
  useCreatePlan,
  useDeactivatePlan,
  useUpdatePlan,
} from "../hooks/usePlatformBilling";
import type { PlanDto } from "@/features/billing/api/billing.types";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

interface PlanFormState {
  slug: string;
  displayName: string;
  minCondominiums: number;
  maxCondominiums: number;
  pricePerCondoReais: number;
  setupFeeReais: number;
  sortOrder: number;
}

const emptyForm: PlanFormState = {
  slug: "",
  displayName: "",
  minCondominiums: 1,
  maxCondominiums: -1,
  pricePerCondoReais: 0,
  setupFeeReais: 2000,
  sortOrder: 0,
};

export function PlansPage() {
  const { data: plans, isLoading } = useAllPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deactivatePlan = useDeactivatePlan();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlanDto | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (plan: PlanDto) => {
    setEditing(plan);
    setForm({
      slug: plan.slug,
      displayName: plan.displayName,
      minCondominiums: plan.minCondominiums,
      maxCondominiums: plan.maxCondominiums,
      pricePerCondoReais: plan.pricePerCondoCents / 100,
      setupFeeReais: plan.setupFeeCents / 100,
      sortOrder: plan.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      slug: form.slug,
      displayName: form.displayName,
      minCondominiums: form.minCondominiums,
      maxCondominiums: form.maxCondominiums,
      pricePerCondoCents: Math.round(form.pricePerCondoReais * 100),
      setupFeeCents: Math.round(form.setupFeeReais * 100),
      sortOrder: form.sortOrder,
    };
    try {
      if (editing) {
        await updatePlan.mutateAsync({ id: editing.id, input: payload });
      } else {
        await createPlan.mutateAsync(payload);
      }
      toast({ title: editing ? "Plano atualizado" : "Plano criado" });
      setDialogOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar plano",
        description: (err as Error).message,
      });
    }
  };

  const handleDeactivate = async (plan: PlanDto) => {
    if (!window.confirm(`Desativar o plano "${plan.displayName}"?`)) return;
    try {
      const result = await deactivatePlan.mutateAsync(plan.id);
      toast({
        title: "Plano desativado",
        description: result.warning ?? undefined,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao desativar",
        description: (err as Error).message,
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-gray-600">Catálogo de faixas de preço da plataforma.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo plano
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faixas ativas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !plans || plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Nenhum plano cadastrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Faixa</TableHead>
                  <TableHead className="text-right">Preço/condomínio</TableHead>
                  <TableHead className="text-right">Setup</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.displayName}</TableCell>
                    <TableCell>
                      {plan.minCondominiums}–
                      {plan.maxCondominiums === -1 ? "∞" : plan.maxCondominiums}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(plan.pricePerCondoCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(plan.setupFeeCents)}
                    </TableCell>
                    <TableCell>
                      {plan.isActive ? (
                        <Badge>Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                        Editar
                      </Button>
                      {plan.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(plan)}
                        >
                          Desativar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Editar ${editing.displayName}` : "Novo plano"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displayName">Nome</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="minCondominiums">Mínimo</Label>
                <Input
                  id="minCondominiums"
                  type="number"
                  value={form.minCondominiums}
                  onChange={(e) =>
                    setForm({ ...form, minCondominiums: Number(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxCondominiums">Máximo (-1 = ilimitado)</Label>
                <Input
                  id="maxCondominiums"
                  type="number"
                  value={form.maxCondominiums}
                  onChange={(e) =>
                    setForm({ ...form, maxCondominiums: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Preço/condomínio (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={form.pricePerCondoReais}
                  onChange={(e) =>
                    setForm({ ...form, pricePerCondoReais: Number(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="setup">Setup (R$)</Label>
                <Input
                  id="setup"
                  type="number"
                  step="0.01"
                  value={form.setupFeeReais}
                  onChange={(e) =>
                    setForm({ ...form, setupFeeReais: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Ordem</Label>
              <Input
                id="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPlan.isPending || updatePlan.isPending}
            >
              {(createPlan.isPending || updatePlan.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { CreditCard, QrCode, Loader2, Receipt } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  useActivePlans,
  useCreateCardBill,
  useCreatePixBill,
  useMyBills,
  useMySubscription,
} from "../hooks/useBilling";
import { PixPaymentDialog } from "../components/PixPaymentDialog";
import type { BillDto, SubscriptionPhase } from "../api/billing.types";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const PHASE_LABEL: Record<SubscriptionPhase, string> = {
  trial: "Período de testes",
  active: "Ativa",
  grace: "Vencimento (tolerância)",
  soft_locked: "Bloqueada — modo leitura",
  hard_locked: "Suspensa",
  expired: "Trial expirado",
  cancelled: "Cancelada",
};

const PHASE_VARIANT: Record<
  SubscriptionPhase,
  "default" | "secondary" | "destructive" | "outline"
> = {
  trial: "secondary",
  active: "default",
  grace: "secondary",
  soft_locked: "destructive",
  hard_locked: "destructive",
  expired: "destructive",
  cancelled: "outline",
};

export function SubscriptionPage() {
  const { data: subscription, isLoading: loadingSub } = useMySubscription();
  const { data: plans } = useActivePlans();
  const { data: bills } = useMyBills();
  const createPix = useCreatePixBill();
  const createCard = useCreateCardBill();
  const { toast } = useToast();
  const [dialogBill, setDialogBill] = useState<BillDto | null>(null);

  const handlePix = async () => {
    try {
      const bill = await createPix.mutateAsync();
      setDialogBill(bill);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PIX",
        description: (err as Error).message,
      });
    }
  };

  const handleCard = async () => {
    try {
      const bill = await createCard.mutateAsync();
      if (bill.checkoutUrl) {
        window.open(bill.checkoutUrl, "_blank");
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao abrir checkout",
          description: "Link de checkout não retornado pelo provedor",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar cobrança",
        description: (err as Error).message,
      });
    }
  };

  if (loadingSub) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold">Sem assinatura</h2>
            <p className="text-gray-600">
              Sua conta não tem uma assinatura ativa. Entre em contato com o
              suporte para configurar seu acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pending = bills?.find((b) => b.status === "PENDING") ?? null;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinatura</h1>
        <p className="text-gray-600">
          Gerencie seu plano, pagamentos e histórico de cobranças.
        </p>
      </div>

      {/* Status header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status atual</CardTitle>
            <Badge variant={PHASE_VARIANT[subscription.phase]}>
              {PHASE_LABEL[subscription.phase]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscription.currentPlan && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Plano atual:</span>
              <span className="font-medium">
                {subscription.currentPlan.displayName} ·{" "}
                {formatCents(subscription.currentPlan.pricePerCondoCents)}/condomínio
              </span>
            </div>
          )}
          {subscription.trialEndsAt && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Trial termina em:</span>
              <span className="font-medium">{formatDate(subscription.trialEndsAt)}</span>
            </div>
          )}
          {subscription.currentPeriodEnd && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Próximo vencimento:</span>
              <span className="font-medium">
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          )}
          {!subscription.setupPaid && (
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
              <strong>Setup de R$ 2.000,00</strong> será cobrado junto do primeiro pagamento.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment actions */}
      {(subscription.phase !== "active" || pending) && (
        <Card>
          <CardHeader>
            <CardTitle>Pagar assinatura</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handlePix}
              disabled={createPix.isPending}
              className="flex-1"
              size="lg"
            >
              {createPix.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Pagar com PIX
            </Button>
            <Button
              onClick={handleCard}
              disabled={createCard.isPending}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              {createCard.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Pagar com cartão
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pricing tiers info */}
      {plans && plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tabela de preços</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              Você paga por condomínio ativo. Quanto mais condomínios, menor o custo
              unitário. O valor da próxima cobrança é calculado automaticamente
              com base na quantidade de condomínios que você gerencia.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border bg-white p-4"
                >
                  <div className="text-sm font-semibold text-gray-900">
                    {p.displayName}
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {formatCents(p.pricePerCondoCents)}
                  </div>
                  <div className="text-xs text-gray-500">por condomínio/mês</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bill history */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <CardTitle>Histórico de cobranças</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!bills || bills.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Nenhuma cobrança encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.slice(0, 12).map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{formatDate(bill.createdAt)}</TableCell>
                    <TableCell>
                      {bill.type === "FIRST_CYCLE"
                        ? "1º ciclo"
                        : bill.type === "MANUAL"
                          ? "Manual"
                          : "Mensal"}
                    </TableCell>
                    <TableCell>{bill.method ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatCents(bill.amountCents)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          bill.status === "PAID"
                            ? "default"
                            : bill.status === "PENDING"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bill.status === "PENDING" && bill.pixBrCode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDialogBill(bill)}
                        >
                          Ver PIX
                        </Button>
                      )}
                      {bill.status === "PENDING" && bill.checkoutUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(bill.checkoutUrl!, "_blank")}
                        >
                          Abrir checkout
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

      <PixPaymentDialog
        bill={dialogBill}
        open={dialogBill !== null}
        onOpenChange={(open) => !open && setDialogBill(null)}
      />
    </div>
  );
}

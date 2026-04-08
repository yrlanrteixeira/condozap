import { Loader2, DollarSign, Users, Clock, AlertTriangle } from "lucide-react";
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
import { usePlatformMetrics } from "../hooks/usePlatformBilling";

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

export function FinanceDashboardPage() {
  const { data, isLoading } = usePlatformMetrics();

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    {
      label: "MRR atual",
      value: formatCents(data.mrrCents),
      icon: DollarSign,
      tone: "text-green-600",
    },
    {
      label: "Assinantes ativos",
      value: String(data.counts.active),
      icon: Users,
      tone: "text-blue-600",
    },
    {
      label: "Em período de testes",
      value: String(data.counts.trial),
      icon: Clock,
      tone: "text-amber-600",
    },
    {
      label: "Inadimplentes",
      value: String(data.overdue.length),
      icon: AlertTriangle,
      tone: "text-red-600",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-gray-600">
          Visão geral das assinaturas e receita recorrente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-full bg-gray-100 p-3 ${m.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{m.label}</div>
                  <div className="text-2xl font-bold">{m.value}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trials expirando nos próximos 7 dias</CardTitle>
        </CardHeader>
        <CardContent>
          {data.trialsExpiring.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              Nenhum trial expira nos próximos 7 dias.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Síndico</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Trial termina</TableHead>
                  <TableHead>Dias restantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.trialsExpiring.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.syndic.name}</TableCell>
                    <TableCell>{sub.syndic.email}</TableCell>
                    <TableCell>{formatDate(sub.trialEndsAt)}</TableCell>
                    <TableCell>{sub.daysUntilPhaseChange ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inadimplentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.overdue.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              Nenhum síndico inadimplente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Síndico</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.overdue.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.syndic.name}</TableCell>
                    <TableCell>{sub.syndic.email}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{sub.phase}</Badge>
                    </TableCell>
                    <TableCell>{sub.plan?.displayName ?? "—"}</TableCell>
                    <TableCell>
                      {formatDate(sub.currentPeriodEnd ?? sub.trialEndsAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

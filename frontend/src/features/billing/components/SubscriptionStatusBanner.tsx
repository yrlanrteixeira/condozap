import { useEffect } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/use-toast";
import { useMySubscription } from "../hooks/useBilling";

/**
 * Global banner shown in the main layout for syndicos whose subscription
 * is approaching or past its renewal / trial end date. Also listens for
 * billing:blocked events (emitted from the api-client interceptor on 402
 * responses) and shows a toast.
 */
export function SubscriptionStatusBanner() {
  const { data: subscription } = useMySubscription();
  const { toast } = useToast();

  useEffect(() => {
    function handleBlocked(e: Event) {
      const detail = (e as CustomEvent<{ reason: string; message: string }>).detail;
      toast({
        variant: "destructive",
        title: "Assinatura necessária",
        description: detail.message,
      });
    }
    window.addEventListener("billing:blocked", handleBlocked);
    return () => window.removeEventListener("billing:blocked", handleBlocked);
  }, [toast]);

  if (!subscription) return null;

  const { phase, daysUntilPhaseChange } = subscription;

  // Active and plenty of time left — nothing to show
  if (phase === "active") return null;
  if (phase === "trial" && (daysUntilPhaseChange ?? 0) > 3) return null;

  // Hard lock is rendered as a full overlay — see LockedOverlay
  if (phase === "hard_locked") return null;

  const tone =
    phase === "trial"
      ? "warning"
      : phase === "grace"
        ? "warning"
        : "danger";

  const styles =
    tone === "warning"
      ? "border-amber-400 bg-amber-50 text-amber-900"
      : "border-red-400 bg-red-50 text-red-900";

  const Icon = tone === "warning" ? Clock : AlertCircle;

  const message = (() => {
    switch (phase) {
      case "trial":
        return daysUntilPhaseChange === 0
          ? "Seu período de testes termina hoje. Assine para continuar."
          : `Seu período de testes termina em ${daysUntilPhaseChange} dia${daysUntilPhaseChange === 1 ? "" : "s"}.`;
      case "grace":
        return daysUntilPhaseChange !== null && daysUntilPhaseChange >= 0
          ? `Sua cobrança venceu. Regularize em ${daysUntilPhaseChange} dia${daysUntilPhaseChange === 1 ? "" : "s"} para evitar bloqueio.`
          : "Sua cobrança venceu. Regularize para evitar bloqueio.";
      case "soft_locked":
        return "Conta em modo leitura por inadimplência. Pague para voltar a usar.";
      case "expired":
        return "Seu período de testes terminou. Assine para continuar.";
      case "cancelled":
        return "Assinatura cancelada. Entre em contato para reativar.";
      default:
        return "Regularize sua assinatura para continuar usando a plataforma.";
    }
  })();

  return (
    <div className={`flex items-center justify-between gap-4 border-b px-4 py-2 ${styles}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <Button asChild size="sm" variant="default">
        <Link to="/assinatura">Gerenciar assinatura</Link>
      </Button>
    </div>
  );
}

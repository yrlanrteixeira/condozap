import { Lock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { useMySubscription } from "../hooks/useBilling";

/**
 * Full-screen blocking overlay shown when the subscription is hard-locked.
 * Only exception: the user can still navigate to /assinatura to pay.
 */
export function HardLockOverlay() {
  const { data: sub } = useMySubscription();
  const location = useLocation();

  if (!sub || sub.phase !== "hard_locked") return null;
  if (location.pathname === "/assinatura") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-lg bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <Lock className="h-7 w-7 text-red-600" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Conta suspensa
        </h2>
        <p className="mb-6 text-gray-600">
          Sua assinatura está inadimplente há mais de 14 dias e o acesso foi
          bloqueado. Regularize o pagamento para voltar a usar a plataforma.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link to="/assinatura">Pagar agora</Link>
        </Button>
      </div>
    </div>
  );
}

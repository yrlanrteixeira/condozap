import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/use-toast";
import type { BillDto } from "../api/billing.types";

interface Props {
  bill: BillDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatCountdown(expiresAt: string | null): string {
  if (!expiresAt) return "—";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expirado";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function PixPaymentDialog({ bill, open, onOpenChange }: Props) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(() => formatCountdown(bill?.expiresAt ?? null));
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !bill) return;
    const t = setInterval(
      () => setCountdown(formatCountdown(bill.expiresAt)),
      60_000,
    );
    setCountdown(formatCountdown(bill.expiresAt));
    return () => clearInterval(t);
  }, [bill, open]);

  if (!bill) return null;

  const handleCopy = async () => {
    if (!bill.pixBrCode) return;
    try {
      await navigator.clipboard.writeText(bill.pixBrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast({
        title: "Código PIX copiado",
        description: "Cole no app do seu banco para pagar.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Não foi possível copiar",
      });
    }
  };

  const qrSrc =
    bill.pixBrCodeBase64 && !bill.pixBrCodeBase64.startsWith("data:")
      ? `data:image/png;base64,${bill.pixBrCodeBase64}`
      : bill.pixBrCodeBase64 ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar via PIX</DialogTitle>
          <DialogDescription>
            {formatCents(bill.amountCents)} — expira em {countdown}
          </DialogDescription>
        </DialogHeader>

        {qrSrc && (
          <div className="flex justify-center py-4">
            <img
              src={qrSrc}
              alt="QR Code PIX"
              className="h-64 w-64 rounded border bg-white p-2"
            />
          </div>
        )}

        {bill.pixBrCode && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              PIX copia e cola
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={bill.pixBrCode}
                className="flex-1 rounded border bg-gray-50 px-3 py-2 text-xs font-mono"
              />
              <Button type="button" onClick={handleCopy} size="sm">
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {bill.breakdown && (
          <div className="rounded-md border bg-gray-50 p-3 text-sm">
            {typeof bill.breakdown.activeCondos === "number" && (
              <div className="flex justify-between">
                <span className="text-gray-600">Condomínios ativos:</span>
                <span className="font-medium">{bill.breakdown.activeCondos}</span>
              </div>
            )}
            {typeof bill.breakdown.cycleAmountCents === "number" && (
              <div className="flex justify-between">
                <span className="text-gray-600">Mensalidade:</span>
                <span className="font-medium">
                  {formatCents(bill.breakdown.cycleAmountCents)}
                </span>
              </div>
            )}
            {typeof bill.breakdown.setupAmountCents === "number" &&
              bill.breakdown.setupAmountCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Setup (único):</span>
                  <span className="font-medium">
                    {formatCents(bill.breakdown.setupAmountCents)}
                  </span>
                </div>
              )}
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
              <span>Total:</span>
              <span>{formatCents(bill.amountCents)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

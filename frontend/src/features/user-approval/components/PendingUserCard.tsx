/**
 * Pending User Card Component
 *
 * Displays a pending user with approve/reject actions
 */

import { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Home,
  Calendar,
  Phone,
  Building2,
  MessageCircle,
  Shield,
} from "lucide-react";
import { formatDateLong } from "@/shared/utils/date";
import type { PendingUser, Condominium } from "../types";

interface PendingUserCardProps {
  user: PendingUser;
  onApprove: (
    userId: string,
    tower: string,
    floor: string,
    unit: string,
    type: "OWNER" | "TENANT",
    condominiumId?: string
  ) => void;
  onReject: (userId: string, reason: string) => void;
  isLoading?: boolean;
  showCondominiumInfo?: boolean;
  condominiums?: Condominium[];
}

export function PendingUserCard({
  user,
  onApprove,
  onReject,
  isLoading = false,
  showCondominiumInfo = false,
  condominiums = [],
}: PendingUserCardProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Approval form state
  const [tower, setTower] = useState(user.requestedTower || "");
  const [floor, setFloor] = useState(user.requestedFloor || "");
  const [unit, setUnit] = useState(user.requestedUnit || "");
  const [type, setType] = useState<"OWNER" | "TENANT">("OWNER");
  const [condominiumId, setCondominiumId] = useState("");

  // Rejection form state
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = () => {
    if (!tower.trim() || !floor.trim() || !unit.trim()) {
      return;
    }
    if (showCondominiumInfo && !condominiumId.trim()) {
      return;
    }
    onApprove(
      user.id,
      tower,
      floor,
      unit,
      type,
      showCondominiumInfo ? condominiumId : undefined
    );
    setShowApproveDialog(false);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      return;
    }
    onReject(user.id, rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason("");
  };

  return (
    <>
      <Card className="border-border hover:border-primary/50 transition-colors">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* User Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg text-foreground">
                      {user.name}
                    </h3>
                    {/* Consent badges */}
                    <div className="flex gap-1">
                      {user.consentDataProcessing && (
                        <Badge
                          variant="outline"
                          className="text-xs border-blue-500 text-blue-600"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          LGPD
                        </Badge>
                      )}
                      {user.consentWhatsapp && (
                        <Badge
                          variant="outline"
                          className="text-xs border-green-500 text-green-600"
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>

              {/* Phone */}
              {user.requestedPhone && (
                <div className="flex items-center gap-2 text-sm ml-11">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{user.requestedPhone}</span>
                </div>
              )}

              {/* Condominium (for SUPER_ADMIN) */}
              {showCondominiumInfo && user.requestedCondominiumId && (
                <div className="flex items-center gap-2 text-sm ml-11">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    <span className="font-medium">Condomínio solicitado:</span>{" "}
                    <code className="bg-muted px-1 rounded text-xs">
                      {user.requestedCondominiumId}
                    </code>
                  </span>
                </div>
              )}

              {/* Requested Unit */}
              {user.requestedTower && (
                <div className="flex items-center gap-2 text-sm ml-11">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    <span className="font-medium">Unidade solicitada:</span>{" "}
                    Torre {user.requestedTower} - Andar {user.requestedFloor} -
                    Apto {user.requestedUnit}
                  </span>
                </div>
              )}

              {/* Created At */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-11">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Cadastrado em{" "}
                  {formatDateLong(user.createdAt)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 md:flex-col md:w-auto w-full">
              <Button
                onClick={() => setShowApproveDialog(true)}
                disabled={isLoading}
                className="flex-1 md:flex-none"
                size="sm"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Aprovar
              </Button>
              <Button
                onClick={() => setShowRejectDialog(true)}
                disabled={isLoading}
                variant="destructive"
                className="flex-1 md:flex-none"
                size="sm"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rejeitar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aprovar Cadastro</DialogTitle>
            <DialogDescription>
              Confirme ou ajuste os dados da unidade para{" "}
              <span className="font-semibold text-foreground">{user.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Condominium Selector (for SUPER_ADMIN) */}
            {showCondominiumInfo && (
              <div className="space-y-2">
                <Label htmlFor="condominiumId">Condomínio</Label>
                <Select value={condominiumId} onValueChange={setCondominiumId}>
                  <SelectTrigger id="condominiumId">
                    <SelectValue placeholder="Selecione o condomínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {condominiums.map((condo) => (
                      <SelectItem key={condo.id} value={condo.id}>
                        {condo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {user.requestedCondominiumId && (
                  <p className="text-xs text-muted-foreground">
                    Solicitado pelo usuário: "{user.requestedCondominiumId}"
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tower">Torre</Label>
                <Input
                  id="tower"
                  value={tower}
                  onChange={(e) => setTower(e.target.value)}
                  placeholder="Ex: A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Andar</Label>
                <Input
                  id="floor"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="Ex: 5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Apto</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ex: 502"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as "OWNER" | "TENANT")}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Proprietário</SelectItem>
                  <SelectItem value="TENANT">Inquilino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show consent info */}
            {(user.consentWhatsapp || user.consentDataProcessing) && (
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">Consentimentos aceitos:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {user.consentDataProcessing && (
                    <li>Tratamento de dados (LGPD)</li>
                  )}
                  {user.consentWhatsapp && <li>Notificações via WhatsApp</li>}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={
                !tower.trim() ||
                !floor.trim() ||
                !unit.trim() ||
                (showCondominiumInfo && !condominiumId.trim()) ||
                isLoading
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aprovar e Alocar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Rejeitar Cadastro</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para{" "}
              <span className="font-semibold text-foreground">{user.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da rejeição</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Unidade informada não existe no condomínio..."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              disabled={!rejectionReason.trim() || isLoading}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rejeitar Cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Editar síndico — SUPER_ADMIN
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Loader2, Pencil, Eye, EyeOff } from "lucide-react";
import { useUpdateSyndic } from "../hooks/useUserManagementApi";
import { useCondominiums } from "@/features/condominiums/hooks/useCondominiumsApi";
import { useToast } from "@/shared/components/ui/use-toast";
import type { Syndic } from "@/features/platform/hooks/useSyndicsApi";

interface EditSyndicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syndic: Syndic | null;
  onSuccess?: () => void;
}

export function EditSyndicDialog({
  open,
  onOpenChange,
  syndic,
  onSuccess,
}: EditSyndicDialogProps) {
  const { toast } = useToast();
  const updateSyndic = useUpdateSyndic();
  const { data: condominiums = [], isLoading: isLoadingCondos } = useCondominiums({
    enabled: open,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"SYNDIC" | "PROFESSIONAL_SYNDIC">("SYNDIC");
  const [selectedCondominiums, setSelectedCondominiums] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open || !syndic) return;
    setName(syndic.name);
    setEmail(syndic.email);
    setPassword("");
    setRole(syndic.role === "PROFESSIONAL_SYNDIC" ? "PROFESSIONAL_SYNDIC" : "SYNDIC");
    setSelectedCondominiums(syndic.condominiums.map((c) => c.condominiumId));
    setShowPassword(false);
  }, [open, syndic]);

  const handleCondominiumToggle = (condoId: string) => {
    setSelectedCondominiums((prev) =>
      prev.includes(condoId) ? prev.filter((id) => id !== condoId) : [...prev, condoId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCondominiums.length === condominiums.length) {
      setSelectedCondominiums([]);
    } else {
      setSelectedCondominiums(condominiums.map((c) => c.id));
    }
  };

  const handleSubmit = async () => {
    if (!syndic) return;

    if (!name.trim() || !email.trim()) {
      toast({
        title: "Erro",
        description: "Preencha nome e e-mail.",
        variant: "destructive",
      });
      return;
    }

    if (password.length > 0 && password.length < 8) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 8 caracteres ou ficar em branco.",
        variant: "destructive",
      });
      return;
    }

    if (role === "SYNDIC" && selectedCondominiums.length === 0) {
      toast({
        title: "Erro",
        description: "Síndico deve estar vinculado a pelo menos um condomínio.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSyndic.mutateAsync({
        userId: syndic.id,
        name: name.trim(),
        email: email.trim(),
        role,
        condominiumIds: selectedCondominiums,
        ...(password.length >= 8 ? { password } : {}),
      });

      toast({
        title: "Síndico atualizado",
        description: "As alterações foram salvas.",
        variant: "success",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: "Erro ao atualizar síndico",
        description: err.response?.data?.message ?? err.message ?? "Erro ao atualizar.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const canSubmit =
    syndic &&
    name.trim() &&
    email.trim() &&
    (role === "PROFESSIONAL_SYNDIC" || selectedCondominiums.length > 0) &&
    (password.length === 0 || password.length >= 8);

  if (!syndic) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar síndico
          </DialogTitle>
          <DialogDescription>
            Atualize dados, tipo de síndico, senha (opcional) e condomínios vinculados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-syndic-name">Nome completo</Label>
            <Input
              id="edit-syndic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-syndic-email">E-mail</Label>
            <Input
              id="edit-syndic-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-syndic-role">Tipo</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "SYNDIC" | "PROFESSIONAL_SYNDIC")}
            >
              <SelectTrigger id="edit-syndic-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SYNDIC">Síndico</SelectItem>
                <SelectItem value="PROFESSIONAL_SYNDIC">Síndico profissional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-syndic-password">Nova senha (opcional)</Label>
            <div className="relative">
              <Input
                id="edit-syndic-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe em branco para manter a atual"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, se preencher.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label>Condomínios</Label>
              {condominiums.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs">
                  {selectedCondominiums.length === condominiums.length
                    ? "Desmarcar todos"
                    : "Selecionar todos"}
                </Button>
              )}
            </div>

            {isLoadingCondos ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : condominiums.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum condomínio cadastrado
              </p>
            ) : (
              <div className="border rounded-lg p-3 max-h-[240px] overflow-y-auto space-y-2">
                {condominiums.map((condo) => (
                  <div
                    key={condo.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`edit-condo-${condo.id}`}
                      checked={selectedCondominiums.includes(condo.id)}
                      onCheckedChange={() => handleCondominiumToggle(condo.id)}
                    />
                    <label
                      htmlFor={`edit-condo-${condo.id}`}
                      className="flex-1 text-sm font-medium cursor-pointer select-none"
                    >
                      {condo.name}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {role === "PROFESSIONAL_SYNDIC" && selectedCondominiums.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Síndico profissional pode ficar sem condomínios vinculados.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || updateSyndic.isPending}>
            {updateSyndic.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

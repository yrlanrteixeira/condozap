import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useToast } from "@/shared/components/ui/use-toast";
import { useCreateAnnouncement } from "../hooks/useAnnouncementsApi";

type Scope = "ALL" | "TOWER" | "FLOOR" | "UNIT";

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominiumId: string;
}

interface FormState {
  title: string;
  content: string;
  scope: Scope;
  targetTower: string;
  targetFloor: string;
  targetUnit: string;
  sendWhatsApp: boolean;
  expiresAt: string;
}

const initialState: FormState = {
  title: "",
  content: "",
  scope: "ALL",
  targetTower: "",
  targetFloor: "",
  targetUnit: "",
  sendWhatsApp: false,
  expiresAt: "",
};

export function CreateAnnouncementDialog({
  open,
  onOpenChange,
  condominiumId,
}: CreateAnnouncementDialogProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const { toast } = useToast();
  const createAnnouncement = useCreateAnnouncement();

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (form.title.trim().length < 3) {
      newErrors.title = "O título deve ter no mínimo 3 caracteres.";
    }
    if (form.content.trim().length < 10) {
      newErrors.content = "O conteúdo deve ter no mínimo 10 caracteres.";
    }
    if (form.scope === "TOWER" && !form.targetTower.trim()) {
      newErrors.targetTower = "Informe o número da torre.";
    }
    if (form.scope === "FLOOR" && !form.targetFloor.trim()) {
      newErrors.targetFloor = "Informe o número do andar.";
    }
    if (form.scope === "UNIT" && !form.targetUnit.trim()) {
      newErrors.targetUnit = "Informe o número da unidade.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createAnnouncement.mutateAsync({
        condominiumId,
        title: form.title.trim(),
        content: form.content.trim(),
        scope: form.scope,
        targetTower: form.scope === "TOWER" ? form.targetTower.trim() : undefined,
        targetFloor: form.scope === "FLOOR" ? form.targetFloor.trim() : undefined,
        targetUnit: form.scope === "UNIT" ? form.targetUnit.trim() : undefined,
        sendWhatsApp: form.sendWhatsApp,
        expiresAt: form.expiresAt ? form.expiresAt : undefined,
      });

      toast({
        title: "Comunicado criado!",
        description: "O comunicado foi publicado com sucesso.",
        variant: "success",
        duration: 3000,
      });

      setForm(initialState);
      setErrors({});
      onOpenChange(false);
    } catch {
      toast({
        title: "Erro ao criar comunicado",
        description: "Não foi possível criar o comunicado. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setForm(initialState);
      setErrors({});
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95%] sm:max-w-lg max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Novo Comunicado</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ann-title"
              placeholder="Título do comunicado"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-content">
              Conteúdo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ann-content"
              placeholder="Escreva o conteúdo do comunicado..."
              className="min-h-[100px]"
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
            />
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content}</p>
            )}
          </div>

          {/* Scope */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-scope">Destinatários</Label>
            <Select
              value={form.scope}
              onValueChange={(value) =>
                setForm((f) => ({
                  ...f,
                  scope: value as Scope,
                  targetTower: "",
                  targetFloor: "",
                  targetUnit: "",
                }))
              }
            >
              <SelectTrigger id="ann-scope">
                <SelectValue placeholder="Selecionar destinatários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os moradores</SelectItem>
                <SelectItem value="TOWER">Torre específica</SelectItem>
                <SelectItem value="FLOOR">Andar específico</SelectItem>
                <SelectItem value="UNIT">Unidade específica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional target fields */}
          {form.scope === "TOWER" && (
            <div className="space-y-1.5">
              <Label htmlFor="ann-tower">
                Torre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ann-tower"
                placeholder="Ex: A, B, 1, 2..."
                value={form.targetTower}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetTower: e.target.value }))
                }
              />
              {errors.targetTower && (
                <p className="text-xs text-destructive">{errors.targetTower}</p>
              )}
            </div>
          )}

          {form.scope === "FLOOR" && (
            <div className="space-y-1.5">
              <Label htmlFor="ann-floor">
                Andar <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ann-floor"
                placeholder="Ex: 1, 2, 3..."
                value={form.targetFloor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetFloor: e.target.value }))
                }
              />
              {errors.targetFloor && (
                <p className="text-xs text-destructive">{errors.targetFloor}</p>
              )}
            </div>
          )}

          {form.scope === "UNIT" && (
            <div className="space-y-1.5">
              <Label htmlFor="ann-unit">
                Unidade <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ann-unit"
                placeholder="Ex: 101, 202..."
                value={form.targetUnit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetUnit: e.target.value }))
                }
              />
              {errors.targetUnit && (
                <p className="text-xs text-destructive">{errors.targetUnit}</p>
              )}
            </div>
          )}

          {/* Expiry date */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-expires">Data de expiração (opcional)</Label>
            <Input
              id="ann-expires"
              type="date"
              value={form.expiresAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiresAt: e.target.value }))
              }
            />
          </div>

          {/* WhatsApp toggle */}
          <div className="flex items-center gap-3 rounded-md border border-border p-3">
            <Checkbox
              id="ann-whatsapp"
              checked={form.sendWhatsApp}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, sendWhatsApp: checked === true }))
              }
            />
            <Label htmlFor="ann-whatsapp" className="cursor-pointer leading-none">
              Enviar via WhatsApp
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createAnnouncement.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createAnnouncement.isPending}>
              {createAnnouncement.isPending ? "Criando..." : "Criar Comunicado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

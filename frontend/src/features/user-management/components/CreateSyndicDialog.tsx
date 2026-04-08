/**
 * Create Syndic Dialog
 *
 * Dialog for SUPER_ADMIN to create syndics and assign them to multiple condominiums
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Loader2, UserPlus, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useCreateSyndic } from '../hooks/useUserManagementApi';
import { useCondominiums } from '@/features/condominiums/hooks/useCondominiumsApi';
import { useToast } from '@/shared/components/ui/use-toast';

interface CreateSyndicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateSyndicDialog({ open, onOpenChange, onSuccess }: CreateSyndicDialogProps) {
  const { toast } = useToast();
  const createSyndic = useCreateSyndic();
  const { data: condominiums = [], isLoading: isLoadingCondos } = useCondominiums({
    enabled: open, // Só busca quando o dialog está aberto
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [selectedCondominiums, setSelectedCondominiums] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCondominiumToggle = (condoId: string) => {
    setSelectedCondominiums(prev =>
      prev.includes(condoId)
        ? prev.filter(id => id !== condoId)
        : [...prev, condoId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCondominiums.length === condominiums.length) {
      setSelectedCondominiums([]);
    } else {
      setSelectedCondominiums(condominiums.map(c => c.id));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedCondominiums.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um condomínio.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createSyndic.mutateAsync({
        ...formData,
        condominiumIds: selectedCondominiums,
      });

      toast({
        title: 'Sucesso!',
        description: `Síndico ${formData.name} criado e vinculado a ${selectedCondominiums.length} condomínio(s).`,
        variant: 'success',
      });

      // Reset form
      setFormData({ name: '', email: '', password: '' });
      setSelectedCondominiums([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: 'Erro ao criar síndico',
        description: err.response?.data?.message || err.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', password: '' });
    setSelectedCondominiums([]);
    onOpenChange(false);
  };

  const isFormValid =
    formData.name &&
    formData.email &&
    formData.password.length >= 8 &&
    selectedCondominiums.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Criar Novo Síndico
          </DialogTitle>
          <DialogDescription>
            Crie um síndico e vincule-o a um ou mais condomínios. Ele terá acesso a todos os selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ex: João da Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Ex: joao@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha inicial</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              O síndico poderá alterar a senha após o primeiro login.
            </p>
          </div>

          {/* Condominium Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label>Condomínios</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedCondominiums.length === condominiums.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
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
                      id={`condo-${condo.id}`}
                      checked={selectedCondominiums.includes(condo.id)}
                      onCheckedChange={() => handleCondominiumToggle(condo.id)}
                    />
                    <label
                      htmlFor={`condo-${condo.id}`}
                      className="flex-1 text-sm font-medium cursor-pointer select-none"
                    >
                      {condo.name}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {selectedCondominiums.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedCondominiums.length} condomínio(s) selecionado(s)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || createSyndic.isPending}
          >
            {createSyndic.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Criar Síndico
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create Admin Dialog — novos membros ativos (acesso administrativo ao condomínio)
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useCreateAdmin } from '../hooks/useUserManagementApi';
import { useToast } from '@/shared/components/ui/use-toast';
import { useAppSelector } from '@/shared/hooks';
import { selectCurrentCondominiumId } from '@/shared/store/slices/condominiumSlice';

interface CreateAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateAdminDialog({ open, onOpenChange, onSuccess }: CreateAdminDialogProps) {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { toast } = useToast();
  const createAdmin = useCreateAdmin();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!currentCondominiumId) {
      toast({
        title: 'Erro',
        description: 'Selecione um condomínio.',
        variant: 'destructive',
      });
      return;
    }

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

    try {
      await createAdmin.mutateAsync({
        ...formData,
        condominiumId: currentCondominiumId,
      });

      toast({
        title: 'Sucesso!',
        description: `${formData.name} foi adicionado como membro ativo.`,
        variant: 'success',
      });

      // Reset form
      setFormData({ name: '', email: '', password: '' });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar membro',
        description: error.response?.data?.message || error.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', password: '' });
    onOpenChange(false);
  };

  const isFormValid = formData.name && formData.email && formData.password.length >= 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo membro ativo
          </DialogTitle>
          <DialogDescription>
            Adicione uma pessoa de confiança para ajudar a gerenciar o condomínio.
            O usuário terá acesso imediato ao sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ex: Maria da Silva"
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
              placeholder="Ex: maria@email.com"
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
              O membro poderá alterar a senha após o primeiro login.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || createAdmin.isPending}
          >
            {createAdmin.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Membro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


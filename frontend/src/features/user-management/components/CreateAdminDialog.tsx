/**
 * Create Admin Dialog — novos membros ativos (gestão ADMIN ou membro de setor)
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useCreateAdmin, useCreateSectorMemberUser } from '../hooks/useUserManagementApi';
import { useToast } from '@/shared/components/ui/use-toast';
import { useAppSelector } from '@/shared/hooks';
import { selectCurrentCondominiumId } from '@/shared/store/slices/condominiumSlice';
import { useSectors } from '@/features/structure/hooks/useSectorsApi';
import { MEMBER_FUNCTION_GROUPS } from '../constants/memberFunctions';
import { getApiErrorMessage } from '@/shared/utils/errorMessages';

type MemberKind = 'gestao' | 'setor';

interface CreateAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateAdminDialog({ open, onOpenChange, onSuccess }: CreateAdminDialogProps) {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { toast } = useToast();
  const createAdmin = useCreateAdmin();
  const createSectorMember = useCreateSectorMemberUser();
  const { data: sectors = [], isLoading: sectorsLoading } = useSectors(currentCondominiumId || '');

  const [memberKind, setMemberKind] = useState<MemberKind>('gestao');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [councilPosition, setCouncilPosition] = useState<string>('__none__');
  const [sectorId, setSectorId] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMemberKind('gestao');
    setFormData({ name: '', email: '', password: '' });
    setCouncilPosition('__none__');
    setSectorId('');
    setShowPassword(false);
  }, [open]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isPending = createAdmin.isPending || createSectorMember.isPending;

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

    if (memberKind === 'setor') {
      if (!sectorId) {
        toast({
          title: 'Selecione o setor',
          description: 'Escolha o setor de atendimento para este membro.',
          variant: 'destructive',
        });
        return;
      }
      if (sectorsLoading) {
        return;
      }
    }

    try {
      if (memberKind === 'setor') {
        await createSectorMember.mutateAsync({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          condominiumId: currentCondominiumId,
          sectorId,
        });
        toast({
          title: 'Sucesso!',
          description: `${formData.name} foi adicionado como membro do setor.`,
          variant: 'success',
        });
      } else {
        const pos =
          councilPosition === '__none__' ? null : councilPosition;
        await createAdmin.mutateAsync({
          ...formData,
          condominiumId: currentCondominiumId,
          councilPosition: pos,
        });
        toast({
          title: 'Sucesso!',
          description: `${formData.name} foi adicionado como membro ativo.`,
          variant: 'success',
        });
      }

      setFormData({ name: '', email: '', password: '' });
      setCouncilPosition('__none__');
      setSectorId('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      toast({
        title: 'Erro ao criar membro',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', password: '' });
    setCouncilPosition('__none__');
    setSectorId('');
    setMemberKind('gestao');
    onOpenChange(false);
  };

  const isFormValid =
    formData.name &&
    formData.email &&
    formData.password.length >= 8 &&
    (memberKind === 'gestao' || (memberKind === 'setor' && sectorId && !sectorsLoading));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo membro ativo
          </DialogTitle>
          <DialogDescription>
            Escolha se a pessoa atua na gestão do condomínio ou no atendimento por setor. O acesso é liberado
            imediatamente após o cadastro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="member-kind">Tipo de perfil</Label>
            <Select
              value={memberKind}
              onValueChange={(v) => setMemberKind(v as MemberKind)}
              disabled={isPending}
            >
              <SelectTrigger id="member-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gestao">Gestão do condomínio (Conselheiro, porteiro, áreas…)</SelectItem>
                <SelectItem value="setor">Membro de setor (atendimento de ocorrências)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {memberKind === 'gestao'
                ? 'Perfil administrativo no condomínio. O rótulo do sistema para este papel é “Conselheiro”; defina a função abaixo se quiser outro cargo (porteiro, obras, etc.).'
                : 'Perfil focado em chamados do setor escolhido (cadastro em Estrutura → Setores).'}
            </p>
          </div>

          {memberKind === 'gestao' && (
            <div className="space-y-2">
              <Label htmlFor="council-position">Função no condomínio (opcional)</Label>
              <Select
                value={councilPosition}
                onValueChange={setCouncilPosition}
                disabled={isPending}
              >
                <SelectTrigger id="council-position">
                  <SelectValue placeholder="Definir depois na lista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Definir depois na lista</SelectItem>
                  {MEMBER_FUNCTION_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </SelectLabel>
                      {group.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {memberKind === 'setor' && (
            <div className="space-y-2">
              <Label htmlFor="sector">Setor de atendimento</Label>
              <Select
                value={sectorId || '__pick__'}
                onValueChange={(v) => setSectorId(v === '__pick__' ? '' : v)}
                disabled={isPending || sectorsLoading}
              >
                <SelectTrigger id="sector">
                  <SelectValue placeholder={sectorsLoading ? 'Carregando setores…' : 'Selecione o setor'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pick__" disabled>
                    Selecione o setor
                  </SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!sectorsLoading && sectors.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Nenhum setor cadastrado neste condomínio. Crie setores em Estrutura → Gerenciar setores.
                </p>
              )}
            </div>
          )}

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
          <Button onClick={handleSubmit} disabled={!isFormValid || isPending}>
            {isPending ? (
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

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Building } from 'lucide-react';
import { useAppSelector } from '@/shared/hooks/useAppSelector';
import { useCondominium } from '@/features/condominiums/hooks/useCondominiumsApi';
import { useUpdateCondominiumSettings } from '../hooks/useSettingsApi';
import { useToast } from '@/shared/components/ui/use-toast';
import { Link } from 'react-router-dom';

export function SettingsCondominiumCard() {
  const { toast } = useToast();
  const currentCondominiumId = useAppSelector((s) => s.condominium.currentCondominiumId);
  const condominiums = useAppSelector((s) => s.condominium.condominiums);
  const condoId = currentCondominiumId ?? condominiums[0]?.id ?? '';

  const { data: condo, isLoading } = useCondominium(condoId);
  const updateSettings = useUpdateCondominiumSettings(condoId);

  const [name, setName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');

  useEffect(() => {
    if (condo) {
      setName(condo.name);
      setWhatsappPhone(condo.whatsappPhone ?? '');
    }
  }, [condo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condoId) return;
    try {
      await updateSettings.mutateAsync({
        name: name.trim(),
        whatsappPhone: whatsappPhone.trim() || null,
      });
      toast({
        title: 'Condomínio atualizado',
        description: 'As configurações do condomínio foram salvas.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar condomínio.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    }
  };

  if (!condoId) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Building className="h-5 w-5 text-primary" />
            Condomínio
          </CardTitle>
          <CardDescription>Nenhum condomínio selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione um condomínio no menu acima para editar as configurações.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Building className="h-5 w-5 text-primary" />
          Condomínio
        </CardTitle>
        <CardDescription>Configurações do condomínio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="condo-name">Nome do condomínio</Label>
            <Input
              id="condo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              minLength={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="condo-whatsapp">WhatsApp (opcional)</Label>
            <Input
              id="condo-whatsapp"
              type="tel"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder="Número para contato"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/structure">Editar estrutura (torres, andares)</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

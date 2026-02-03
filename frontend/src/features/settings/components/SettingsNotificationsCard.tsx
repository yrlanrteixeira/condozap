import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Bell } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/use-toast';

export function SettingsNotificationsCard() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [consentWhatsapp, setConsentWhatsapp] = useState(user?.consentWhatsapp ?? true);
  const [consentDataProcessing, setConsentDataProcessing] = useState(
    user?.consentDataProcessing ?? true
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setConsentWhatsapp(user.consentWhatsapp ?? true);
      setConsentDataProcessing(user.consentDataProcessing ?? true);
    }
  }, [user?.consentWhatsapp, user?.consentDataProcessing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        consentWhatsapp,
        consentDataProcessing,
      });
      toast({
        title: 'Preferências salvas',
        description: 'Suas preferências de notificação foram atualizadas.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar preferências.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          Notificações
        </CardTitle>
        <CardDescription>Preferências de notificações</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="consent-whatsapp"
              checked={consentWhatsapp}
              onCheckedChange={(checked) => setConsentWhatsapp(checked === true)}
            />
            <Label htmlFor="consent-whatsapp" className="cursor-pointer font-normal">
              Receber notificações e comunicações via WhatsApp
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="consent-data"
              checked={consentDataProcessing}
              onCheckedChange={(checked) => setConsentDataProcessing(checked === true)}
            />
            <Label htmlFor="consent-data" className="cursor-pointer font-normal">
              Autorizar uso dos dados para envio de mensagens do condomínio (LGPD)
            </Label>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar preferências'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

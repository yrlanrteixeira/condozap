import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { User, Globe, Lock, Camera } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRole } from '@/shared/hooks/useRole';
import { useToast } from '@/shared/components/ui/use-toast';
import { api } from '@/lib/api';
import { UserRoles } from '@/config/permissions';

// Syndic roles that get expanded profile sections
const SYNDIC_ROLES = [UserRoles.SYNDIC, UserRoles.PROFESSIONAL_SYNDIC];

export function SettingsProfileCard() {
  const { user, updateProfile } = useAuth();
  const { userRole } = useRole();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSyndicUser = !!userRole && SYNDIC_ROLES.includes(userRole as typeof SYNDIC_ROLES[number]);

  // --- Public section state ---
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [contactPhone, setContactPhone] = useState(user?.contactPhone ?? '');
  const [officeHours, setOfficeHours] = useState(user?.officeHours ?? '');
  const [publicNotes, setPublicNotes] = useState(user?.publicNotes ?? '');

  // --- Private section state ---
  const [address, setAddress] = useState(user?.address ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl ?? '');
  const [privateNotes, setPrivateNotes] = useState(user?.privateNotes ?? '');

  const [savingPublic, setSavingPublic] = useState(false);
  const [savingPrivate, setSavingPrivate] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setPhotoUrl(user.photoUrl ?? '');
    setContactPhone(user.contactPhone ?? '');
    setOfficeHours(user.officeHours ?? '');
    setPublicNotes(user.publicNotes ?? '');
    setAddress(user.address ?? '');
    setWebsiteUrl(user.websiteUrl ?? '');
    setPrivateNotes(user.privateNotes ?? '');
  }, [user]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post<{ url: string; mimeType: string }>(
        '/uploads/media',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setPhotoUrl(data.url);
      toast({
        title: 'Foto carregada',
        description: 'Clique em Salvar para confirmar a alteração.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer upload da foto.';
      toast({
        title: 'Erro no upload',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSavePublic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingPublic(true);
    try {
      await updateProfile({
        name: name.trim(),
        photoUrl: photoUrl || undefined,
        contactPhone: contactPhone.trim() || undefined,
        officeHours: officeHours.trim() || undefined,
        publicNotes: publicNotes.trim() || undefined,
      });
      toast({
        title: 'Perfil público atualizado',
        description: 'Suas informações públicas foram salvas com sucesso.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar perfil.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSavingPublic(false);
    }
  };

  const handleSavePrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrivate(true);
    try {
      await updateProfile({
        address: address.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        privateNotes: privateNotes.trim() || undefined,
      });
      toast({
        title: 'Dados privados atualizados',
        description: 'Seus dados privados foram salvos com sucesso.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar dados privados.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSavingPrivate(false);
    }
  };

  // ----------------------------------------------------------------
  // Basic profile for non-syndic users (RESIDENT, ADMIN, etc.)
  // ----------------------------------------------------------------
  if (!isSyndicUser) {
    return (
      <BasicProfileCard
        name={name}
        email={user?.email ?? ''}
        phone={contactPhone}
        saving={savingPublic}
        onNameChange={setName}
        onPhoneChange={setContactPhone}
        onSubmit={handleSavePublic}
      />
    );
  }

  // ----------------------------------------------------------------
  // Expanded profile for SYNDIC / PROFESSIONAL_SYNDIC
  // ----------------------------------------------------------------
  return (
    <>
      {/* Card 1 — Perfil Público */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            Perfil Público
            <Badge className="bg-green-600 text-white hover:bg-green-600 border-transparent text-xs">
              Público
            </Badge>
          </CardTitle>
          <CardDescription>
            Informações visíveis para os moradores do condomínio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePublic} className="space-y-4">
            {/* Photo upload */}
            <div className="space-y-2">
              <Label>Foto de perfil</Label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handlePhotoClick}
                  disabled={uploadingPhoto}
                  className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                  aria-label="Clique para alterar foto de perfil"
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Foto de perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
                <div className="text-sm text-muted-foreground">
                  {uploadingPhoto ? (
                    <span>Enviando...</span>
                  ) : (
                    <span>Clique na foto para alterar. PNG, JPEG ou WebP.</span>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                minLength={3}
                required
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Telefone de contato</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            {/* Office Hours */}
            <div className="space-y-2">
              <Label htmlFor="profile-office-hours">Horário de atendimento</Label>
              <Input
                id="profile-office-hours"
                value={officeHours}
                onChange={(e) => setOfficeHours(e.target.value)}
                placeholder="Ex: Seg-Sex, 08h-18h"
              />
            </div>

            {/* Public Notes */}
            <div className="space-y-2">
              <Label htmlFor="profile-public-notes">Observações públicas</Label>
              <Textarea
                id="profile-public-notes"
                value={publicNotes}
                onChange={(e) => setPublicNotes(e.target.value)}
                placeholder="Informações visíveis para os moradores..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={savingPublic || uploadingPhoto}>
              {savingPublic ? 'Salvando...' : 'Salvar perfil público'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 2 — Dados Privados */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            Dados Privados
            <Badge variant="destructive" className="text-xs">
              Privado
            </Badge>
          </CardTitle>
          <CardDescription>
            Informações privadas — não visíveis para os moradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePrivate} className="space-y-4">
            {/* Email — read only */}
            <div className="space-y-2">
              <Label htmlFor="profile-email">E-mail</Label>
              <Input
                id="profile-email"
                type="email"
                value={user?.email ?? ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado.
              </p>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="profile-address">Endereço</Label>
              <Input
                id="profile-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, cidade..."
              />
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="profile-website">Site / URL</Label>
              <Input
                id="profile-website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Private Notes */}
            <div className="space-y-2">
              <Label htmlFor="profile-private-notes">Notas privadas</Label>
              <Textarea
                id="profile-private-notes"
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Anotações internas..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={savingPrivate}>
              {savingPrivate ? 'Salvando...' : 'Salvar dados privados'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

// ----------------------------------------------------------------
// Basic profile card (residents / admins)
// ----------------------------------------------------------------
interface BasicProfileCardProps {
  name: string;
  email: string;
  phone: string;
  saving: boolean;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function BasicProfileCard({
  name,
  email,
  phone,
  saving,
  onNameChange,
  onPhoneChange,
  onSubmit,
}: BasicProfileCardProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          Perfil
        </CardTitle>
        <CardDescription>Gerencie suas informações pessoais</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Seu nome"
              minLength={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Telefone</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="(11) 99999-9999"
            />
            <p className="text-xs text-muted-foreground">
              Este é o número usado para receber notificações via WhatsApp.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O e-mail não pode ser alterado.
            </p>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

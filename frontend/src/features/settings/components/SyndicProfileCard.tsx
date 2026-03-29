import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { User, Phone, Clock, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppSelector } from '@/shared/hooks/useAppSelector';

interface SyndicPublicProfile {
  id: string;
  name: string;
  photoUrl?: string;
  contactPhone?: string;
  officeHours?: string;
  publicNotes?: string;
}

function useSyndicProfile(condominiumId: string | null | undefined) {
  return useQuery<SyndicPublicProfile>({
    queryKey: ['condominiums', condominiumId, 'syndic-profile'],
    queryFn: async () => {
      const { data } = await api.get<SyndicPublicProfile>(
        `/condominiums/${condominiumId}/syndic-profile`
      );
      return data;
    },
    enabled: !!condominiumId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function SyndicProfileCard() {
  const currentCondominiumId = useAppSelector(
    (s) => s.condominium.currentCondominiumId
  );
  const condominiums = useAppSelector((s) => s.condominium.condominiums);
  const condoId = currentCondominiumId ?? condominiums[0]?.id ?? null;

  const { data: syndic, isLoading, isError } = useSyndicProfile(condoId);

  if (!condoId) {
    return null;
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

  if (isError || !syndic) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            Seu Síndico
          </CardTitle>
          <CardDescription>Contato do síndico do condomínio</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum síndico encontrado para este condomínio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          Seu Síndico
        </CardTitle>
        <CardDescription>Contato do síndico do condomínio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="h-16 w-16 shrink-0 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center">
            {syndic.photoUrl ? (
              <img
                src={syndic.photoUrl}
                alt={`Foto de ${syndic.name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3 min-w-0">
            <p className="font-semibold text-base leading-tight truncate">
              {syndic.name}
            </p>

            {syndic.contactPhone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{syndic.contactPhone}</span>
              </div>
            )}

            {syndic.officeHours && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{syndic.officeHours}</span>
              </div>
            )}

            {syndic.publicNotes && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="whitespace-pre-wrap break-words">{syndic.publicNotes}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

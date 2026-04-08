/**
 * Condominium Card Component
 */

import { Building2, Users, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import type { Condominium } from '../types';

interface CondominiumCardProps {
  condominium: Condominium;
  onEdit: (condominium: Condominium) => void;
  onDelete: (condominium: Condominium) => void;
}

const statusConfig = {
  TRIAL: { label: 'Trial', variant: 'outline' as const, className: 'border-yellow-500 text-yellow-600' },
  ACTIVE: { label: 'Ativo', variant: 'default' as const, className: 'bg-green-500' },
  SUSPENDED: { label: 'Suspenso', variant: 'destructive' as const, className: '' },
};

export function CondominiumCard({ condominium, onEdit, onDelete }: CondominiumCardProps) {
  const status = statusConfig[condominium.status];
  
  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{condominium.name}</h3>
                <Badge variant={status.variant} className={status.className}>
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                CNPJ: {formatCNPJ(condominium.cnpj)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                Cadastro moradores:{" "}
                {`${typeof window !== "undefined" ? window.location.origin : ""}/auth/register/${condominium.slug}`}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(condominium)}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(condominium)}
              title="Excluir"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {condominium._count && (
          <div className="flex gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{condominium._count.residents} moradores</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{condominium._count.users} usuários</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span>{condominium._count.complaints} ocorrências</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


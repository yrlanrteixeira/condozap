/**
 * Condominium Form Component
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateCondominiumSchema, type CreateCondominiumInput } from '../schemas';
import type { Condominium, CondominiumStatus } from '../types';

interface CondominiumFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  condominium?: Condominium | null;
  onSubmit: (data: CreateCondominiumInput & { status?: CondominiumStatus }) => Promise<void>;
  isLoading?: boolean;
}

export function CondominiumForm({
  isOpen,
  onOpenChange,
  condominium,
  onSubmit,
  isLoading = false,
}: CondominiumFormProps) {
  const isEditing = !!condominium;

  const form = useForm<CreateCondominiumInput & { status?: CondominiumStatus }>({
    resolver: zodResolver(CreateCondominiumSchema),
    defaultValues: {
      name: condominium?.name || '',
      cnpj: condominium?.cnpj || '',
      whatsappPhone: condominium?.whatsappPhone || '',
      whatsappBusinessId: condominium?.whatsappBusinessId || '',
      status: condominium?.status || 'TRIAL',
    },
  });

  const handleSubmit = async (data: CreateCondominiumInput & { status?: CondominiumStatus }) => {
    await onSubmit(data);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  // Reset form when condominium changes
  if (condominium && form.getValues('name') !== condominium.name) {
    form.reset({
      name: condominium.name,
      cnpj: condominium.cnpj,
      whatsappPhone: condominium.whatsappPhone || '',
      whatsappBusinessId: condominium.whatsappBusinessId || '',
      status: condominium.status,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Condomínio' : 'Novo Condomínio'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do condomínio'
              : 'Preencha os dados para criar um novo condomínio'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Condomínio</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Condomínio Vista Verde" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00000000000000"
                      maxLength={14}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Apenas números (14 dígitos)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TRIAL">Trial</SelectItem>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="whatsappPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone WhatsApp (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="5511999999999" {...field} />
                  </FormControl>
                  <FormDescription>
                    Número com código do país (55) + DDD
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : isEditing ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Condomínio'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


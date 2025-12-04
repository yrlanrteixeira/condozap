import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COMPLAINT_CATEGORIES } from '@/config/constants';
import { ComplaintSchema, type ComplaintFormData } from '@/schemas';

interface ComplaintFormProps {
  onSubmit: (data: { category: string; content: string }) => void;
}

export const ComplaintForm = ({ onSubmit }: ComplaintFormProps) => {
  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComplaintFormData>({
    resolver: zodResolver(ComplaintSchema),
    defaultValues: {
      category: COMPLAINT_CATEGORIES[0],
      content: '',
    },
  });

  const category = watch('category');

  const handleSubmit = (data: ComplaintFormData) => {
    onSubmit({ content: data.content, category: data.category });
    reset();
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
      <CardContent className="p-4 sm:p-6">
        <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-foreground flex items-center gap-2">
          <AlertTriangle size={20} className="text-primary" />
          Nova Ocorrência
        </h3>

        <form onSubmit={handleFormSubmit(handleSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
                Categoria
              </label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setValue('category', value as (typeof COMPLAINT_CATEGORIES)[number])
                }
              >
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
                Descrição do Problema
              </label>
              <Input
                placeholder="Ex: Som alto no andar de cima..."
                {...register('content')}
                className={errors.content ? 'border-red-500' : ''}
              />
              {errors.content && (
                <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Denúncia'}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};



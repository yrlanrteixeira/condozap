import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useSectors } from "@/features/structure/hooks/useSectorsApi";
import { useAppSelector } from "@/shared/hooks";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { COMPLAINT_CATEGORIES } from "@/config/constants";
import {
  buildComplaintContent,
  defaultComplaintFormValues,
  normalizeComplaintCategory,
  type ComplaintFormShape,
} from "../utils/complaintFormByCategory";

const SECURITY_TYPE_LABELS = [
  "Acesso irregular / portaria",
  "Iluminação / escuridão",
  "Briga ou perturbação",
  "Outro",
] as const;

const NOISE_PERIOD_LABELS = [
  "Durante o dia",
  "À noite",
  "Madrugada",
  "Fins de semana",
] as const;

const complaintFormSchema = z
  .object({
    category: z.string().min(1, "Selecione uma categoria"),
    maintenanceLocation: z.string().optional(),
    maintenanceEquipment: z.string().optional(),
    cleaningArea: z.string().optional(),
    securityType: z.string().optional(),
    noisePeriod: z.string().optional(),
    noiseSource: z.string().optional(),
    parkingInfo: z.string().optional(),
    commonAreaName: z.string().optional(),
    otherSubject: z.string().optional(),
    genericSubject: z.string().optional(),
    details: z.string().min(10, "Descrição deve ter ao menos 10 caracteres"),
  })
  .superRefine((data, ctx) => {
    const key = normalizeComplaintCategory(data.category);
    if (key === "Limpeza") {
      const v = data.cleaningArea?.trim() ?? "";
      if (v.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Informe o local ou área a ser limpa",
          path: ["cleaningArea"],
        });
      }
    }
    if (key === "Segurança") {
      if (!data.securityType?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Selecione o tipo de ocorrência",
          path: ["securityType"],
        });
      }
    }
    if (key === "Barulho") {
      if (!data.noisePeriod?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Selecione o período",
          path: ["noisePeriod"],
        });
      }
    }
    if (key === "Área Comum") {
      const v = data.commonAreaName?.trim() ?? "";
      if (v.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Informe qual área comum",
          path: ["commonAreaName"],
        });
      }
    }
    if (key === "Outros") {
      const v = data.otherSubject?.trim() ?? "";
      if (v.length < 3) {
        ctx.addIssue({
          code: "custom",
          message: "Informe um resumo do assunto (mín. 3 caracteres)",
          path: ["otherSubject"],
        });
      }
    }
    if (key === "OTHER") {
      const v = data.genericSubject?.trim() ?? "";
      if (v.length < 3) {
        ctx.addIssue({
          code: "custom",
          message: "Informe o assunto desta ocorrência (mín. 3 caracteres)",
          path: ["genericSubject"],
        });
      }
    }
  });

interface ComplaintFormProps {
  onSubmit: (data: { category: string; content: string }) => void;
}

export const ComplaintForm = ({ onSubmit }: ComplaintFormProps) => {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { can } = usePermissions();
  const canViewStructure = can("view:structure");
  const { data: sectors } = useSectors(
    canViewStructure ? (currentCondominiumId ?? "") : ""
  );

  const dynamicCategories = useMemo(() => {
    if (sectors?.length) {
      const merged = [...new Set(sectors.flatMap((s) => s.categories))].sort();
      return merged.includes("Outras") ? merged : [...merged, "Outras"];
    }
    const base = [...COMPLAINT_CATEGORIES];
    return base.includes("Outros") ? base : [...base, "Outros"];
  }, [sectors]);

  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComplaintFormShape>({
    resolver: zodResolver(complaintFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { ...defaultComplaintFormValues },
  });

  const category = watch("category");
  const normalized = category
    ? normalizeComplaintCategory(category)
    : ("OTHER" as const);

  const prevCategoryRef = useRef<string>("");
  useEffect(() => {
    if (!category) return;
    if (prevCategoryRef.current && prevCategoryRef.current !== category) {
      setValue("maintenanceLocation", "");
      setValue("maintenanceEquipment", "");
      setValue("cleaningArea", "");
      setValue("securityType", "");
      setValue("noisePeriod", "");
      setValue("noiseSource", "");
      setValue("parkingInfo", "");
      setValue("commonAreaName", "");
      setValue("otherSubject", "");
      setValue("genericSubject", "");
    }
    prevCategoryRef.current = category;
  }, [category, setValue]);

  const handleSubmit = (data: ComplaintFormShape) => {
    const content = buildComplaintContent(data.category, data);
    onSubmit({ content, category: data.category });
    reset({ ...defaultComplaintFormValues });
    prevCategoryRef.current = "";
  };

  const renderCategoryFields = () => {
    if (!category) {
      return (
        <p className="text-sm text-muted-foreground">
          Escolha uma categoria para ver os campos do formulário.
        </p>
      );
    }

    switch (normalized) {
      case "Manutenção":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
                Local (bloco, andar, garagem…)
              </label>
              <Input
                placeholder="Ex: Torre A, hall social"
                {...register("maintenanceLocation")}
                className={errors.maintenanceLocation ? "border-red-500" : ""}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
                Equipamento ou item
              </label>
              <Input
                placeholder="Ex: Elevador 2, bomba da piscina"
                {...register("maintenanceEquipment")}
              />
            </div>
          </div>
        );
      case "Limpeza":
        return (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
              Área ou local
            </label>
            <Input
              placeholder="Ex: Corredor 5º andar, playground"
              {...register("cleaningArea")}
              className={errors.cleaningArea ? "border-red-500" : ""}
            />
            {errors.cleaningArea && (
              <p className="text-xs text-red-500 mt-1">
                {errors.cleaningArea.message}
              </p>
            )}
          </div>
        );
      case "Segurança":
        return (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
              Tipo
            </label>
            <Select
              value={watch("securityType") || undefined}
              onValueChange={(v) => setValue("securityType", v)}
            >
              <SelectTrigger
                className={errors.securityType ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_TYPE_LABELS.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.securityType && (
              <p className="text-xs text-red-500 mt-1">
                {errors.securityType.message}
              </p>
            )}
          </div>
        );
      case "Barulho":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
                Período
              </label>
              <Select
                value={watch("noisePeriod") || undefined}
                onValueChange={(v) => setValue("noisePeriod", v)}
              >
                <SelectTrigger
                  className={errors.noisePeriod ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Quando ocorre" />
                </SelectTrigger>
                <SelectContent>
                  {NOISE_PERIOD_LABELS.map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.noisePeriod && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.noisePeriod.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
                Origem aproximada (opcional)
              </label>
              <Input
                placeholder="Ex: Apartamento acima, área de lazer"
                {...register("noiseSource")}
              />
            </div>
          </div>
        );
      case "Estacionamento":
        return (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
              Vaga, box ou placa (opcional)
            </label>
            <Input
              placeholder="Ex: Vaga 042, ABC1D23"
              {...register("parkingInfo")}
            />
          </div>
        );
      case "Área Comum":
        return (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
              Qual área comum
            </label>
            <Input
              placeholder="Ex: Salão de festas, churrasqueira 2"
              {...register("commonAreaName")}
              className={errors.commonAreaName ? "border-red-500" : ""}
            />
            {errors.commonAreaName && (
              <p className="text-xs text-red-500 mt-1">
                {errors.commonAreaName.message}
              </p>
            )}
          </div>
        );
      case "Outros":
        return (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
              Resumo do assunto
            </label>
            <Input
              placeholder="Em poucas palavras, sobre o que é"
              {...register("otherSubject")}
              className={errors.otherSubject ? "border-red-500" : ""}
            />
            {errors.otherSubject && (
              <p className="text-xs text-red-500 mt-1">
                {errors.otherSubject.message}
              </p>
            )}
          </div>
        );
      default:
        return (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
              Assunto
            </label>
            <Input
              placeholder="Descreva em uma linha o tipo de problema"
              {...register("genericSubject")}
              className={errors.genericSubject ? "border-red-500" : ""}
            />
            {errors.genericSubject && (
              <p className="text-xs text-red-500 mt-1">
                {errors.genericSubject.message}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
      <CardContent className="p-4 sm:p-6">
        <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-foreground flex items-center gap-2">
          <AlertTriangle size={20} className="text-primary" />
          Nova Ocorrência
        </h3>

        <form onSubmit={handleFormSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
                Categoria
              </label>
              <Select
                value={category || undefined}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger
                  className={errors.category ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {dynamicCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.category.message}
                </p>
              )}
            </div>
          </div>

          {renderCategoryFields()}

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
              {normalized === "Manutenção"
                ? "O que está acontecendo"
                : "Descrição do problema"}
            </label>
            <Textarea
              placeholder="Descreva com o máximo de detalhes possível para agilizar o atendimento."
              rows={4}
              {...register("details")}
              className={errors.details ? "border-red-500" : ""}
            />
            {errors.details && (
              <p className="text-xs text-red-500 mt-1">
                {errors.details.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? "Enviando..." : "Enviar Denúncia"}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

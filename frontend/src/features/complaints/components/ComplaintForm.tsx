import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Upload, X, FileAudio, ImageIcon, Mic, MicOff, Play, Pause, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useSectors, useSectorCategories } from "@/features/structure/hooks/useSectorsApi";
import { useAppSelector } from "@/shared/hooks";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { useFileUpload } from "@/shared/hooks/useFileUpload";
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
  onSubmit: (data: { 
    category: string; 
    content: string;
    attachments?: Array<{ fileUrl: string; fileName: string; fileType: string; fileSize: number }>;
  }) => Promise<void>;
}

export const ComplaintForm = ({ onSubmit }: ComplaintFormProps) => {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { can } = usePermissions();
  const { data: sectorCategories } = useSectorCategories(currentCondominiumId ?? undefined);
  const { toast } = useToast();

  const dynamicCategories = useMemo(() => {
    if (sectorCategories?.length) {
      return sectorCategories.includes("Outras") ? sectorCategories : [...sectorCategories, "Outras"];
    }
    const base = [...COMPLAINT_CATEGORIES];
    return base.includes("Outros") ? base : [...base, "Outros"];
  }, [sectorCategories]);

  // Upload de anexos
  const [attachments, setAttachments] = useState<Array<{
    file: File;
    preview?: string;
    uploading?: boolean;
    uploadedUrl?: string;
  }>>([]);
  const { uploadFile } = useFileUpload({
    maxSizeMB: 10,
    allowedTypes: ["image/png", "image/jpeg", "image/webp", "audio/mpeg", "audio/mp4", "audio/webm"],
  });

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedAudio({ blob, url: URL.createObjectURL(blob) });
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    }
  };

  const addRecordedAudio = () => {
    if (recordedAudio && attachments.length < 5) {
      const audioFile = new File([recordedAudio.blob], "mensagem-audio.webm", { 
        type: "audio/webm" 
      });
      setAttachments((prev) => [...prev, { 
        file: audioFile, 
        preview: recordedAudio.url 
      }]);
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    }
  };

  const togglePlaybackPreview = () => {
    if (audioPreviewRef.current) {
      if (isPlayingPreview) {
        audioPreviewRef.current.pause();
      } else {
        audioPreviewRef.current.play();
      }
      setIsPlayingPreview(!isPlayingPreview);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + attachments.length > 5) {
      toast({ title: "Limite excedido", description: "Máximo de 5 arquivos por ocorrência", variant: "error" });
      return;
    }
    const newAttachments = files.map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const att = prev[index];
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadAllAttachments = async () => {
    const uploaded = [];
    for (const att of attachments) {
      if (att.uploadedUrl) {
        uploaded.push({ fileUrl: att.uploadedUrl, fileName: att.file.name, fileType: att.file.type, fileSize: att.file.size });
        continue;
      }
      try {
        const result = await uploadFile(att.file, "/uploads/media", {});
        const url = result.url || result.fileUrl || result.path;
        uploaded.push({ fileUrl: url, fileName: att.file.name, fileType: att.file.type, fileSize: att.file.size });
      } catch {
        throw new Error(`Falha ao enviar: ${att.file.name}`);
      }
    }
    return uploaded;
  };

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

  const handleSubmit = async (data: ComplaintFormShape) => {
    try {
      // Se houver anexos, faz upload primeiro
      let attachmentData: Array<{ fileUrl: string; fileName: string; fileType: string; fileSize: number }> = [];
      if (attachments.length > 0) {
        attachmentData = await uploadAllAttachments();
      }
      await onSubmit({ 
        content: buildComplaintContent(data.category, data), 
        category: data.category,
        attachments: attachmentData,
      });
      reset({ ...defaultComplaintFormValues });
      prevCategoryRef.current = "";
      setAttachments([]);
    } catch {
      // Erro já tratado pelo onSubmit
    }
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

          {/* Gravação de áudio */}
          {(isRecording || recordedAudio) && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Gravação de áudio
              </label>
              {isRecording && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-700 flex-1">Gravando...</span>
                  <Button type="button" size="sm" variant="outline" onClick={stopRecording} className="bg-red-500 text-white hover:bg-red-600">
                    <MicOff className="h-4 w-4 mr-1" />
                    Parar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={cancelRecording} className="text-red-500">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {recordedAudio && !isRecording && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <audio ref={audioPreviewRef} src={recordedAudio.url} onEnded={() => setIsPlayingPreview(false)} />
                  <Button type="button" size="sm" variant="outline" onClick={togglePlaybackPreview} className="h-9 w-9 p-0">
                    {isPlayingPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <span className="text-sm text-amber-800 flex-1">Áudio gravado</span>
                  <Button type="button" size="sm" onClick={addRecordedAudio} className="h-8">
                    <Upload className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={cancelRecording} className="text-red-500 h-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Botão de gravar */}
          {!isRecording && !recordedAudio && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Ou grave um áudio
              </label>
              <Button type="button" variant="outline" onClick={startRecording} className="w-full">
                <Mic className="h-4 w-4 mr-2" />
                Gravar áudio
              </Button>
            </div>
          )}

          {/* Anexos */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Anexos (opcional)
            </label>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div key={i} className="relative group rounded-md border overflow-hidden w-20 h-20">
                  {att.preview ? (
                    <img src={att.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <FileAudio className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {att.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ))}
              {attachments.length < 5 && (
                <label className="cursor-pointer rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 w-20 h-20 flex flex-col items-center justify-center gap-1 transition-colors">
                  <input type="file" accept="image/*,audio/*" multiple className="hidden" onChange={handleFileChange} />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Adicionar</span>
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Máximo 5 arquivos (imagens ou áudio)</p>
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

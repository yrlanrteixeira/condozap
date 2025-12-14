import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface UseFileUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxSizeMB = 10,
    allowedTypes = [],
    onSuccess,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const validateFile = (file: File): string | null => {
    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`;
    }

    // Validate file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(", ")}`;
    }

    return null;
  };

  const uploadFile = async (
    file: File,
    endpoint: string,
    additionalData?: Record<string, any>
  ): Promise<any> => {
    setIsUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);

      // Add additional data
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
      }

      // Upload file with progress tracking
      const response = await apiClient.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage,
            });
          }
        },
      });

      setProgress(null);
      setIsUploading(false);

      if (onSuccess) {
        onSuccess(response.data);
      }

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Erro ao fazer upload";
      const uploadError = new Error(errorMessage);
      setError(uploadError);
      setIsUploading(false);
      setProgress(null);

      if (onError) {
        onError(uploadError);
      } else {
        toast.error(errorMessage);
      }

      throw uploadError;
    }
  };

  const reset = () => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  };

  return {
    uploadFile,
    isUploading,
    progress,
    error,
    reset,
  };
}

/**
 * Hook específico para upload de anexos em chamados
 */
export function useComplaintAttachmentUpload(complaintId: number) {
  return useFileUpload({
    maxSizeMB: 10,
    allowedTypes: [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg",
      "audio/webm",
      "audio/wav",
    ],
  });
}

/**
 * Hook específico para upload de documentos de moradores
 */
export function useResidentDocumentUpload() {
  return useFileUpload({
    maxSizeMB: 10,
    allowedTypes: [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
    ],
  });
}

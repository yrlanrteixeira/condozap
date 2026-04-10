import { useState } from "react";
import { FileUpload } from "@/shared/components/FileUpload";
import { useComplaintAttachmentUpload } from "@/shared/hooks/useFileUpload";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/shared/components/ui/use-toast";
import { Button } from "@/shared/components/ui/button";
import { Image, Music, Trash2, Download, Play, Pause } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { formatRelativeTime } from "@/shared/utils/date";
import { AudioPlayer } from "@/shared/components/AudioPlayer";
import { ProxiedImage } from "@/shared/components/ProxiedImage";

interface ComplaintAttachment {
  id: string;
  complaintId: number;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

interface ComplaintAttachmentUploadProps {
  complaintId: number;
  attachments?: ComplaintAttachment[];
  onAttachmentAdded?: (attachment: ComplaintAttachment) => void;
  onAttachmentDeleted?: (attachmentId: string) => void;
  showDelete?: boolean;
}

export function ComplaintAttachmentUpload({
  complaintId,
  attachments = [],
  onAttachmentAdded,
  onAttachmentDeleted,
  showDelete = true,
}: ComplaintAttachmentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { uploadFile, isUploading, progress } = useComplaintAttachmentUpload(complaintId);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const response = await uploadFile(
        selectedFile,
        `/uploads/complaints/${complaintId}/attachments`
      );

      toast({ title: "Anexo enviado com sucesso!", variant: "success" });
      setSelectedFile(null);
      setIsDialogOpen(false);

      if (onAttachmentAdded && response.data) {
        onAttachmentAdded(response.data);
      }
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("Tem certeza que deseja deletar este anexo?")) {
      return;
    }

    try {
      await apiClient.delete(`/uploads/complaints/attachments/${attachmentId}`);
      toast({ title: "Anexo deletado com sucesso!", variant: "success" });

      if (onAttachmentDeleted) {
        onAttachmentDeleted(attachmentId);
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast({ title: "Erro", description: axiosError?.response?.data?.message || "Erro ao deletar anexo", variant: "destructive" });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <Image className="w-5 h-5 text-blue-500" />;
    }
    if (fileType.startsWith("audio/")) {
      return <Music className="w-5 h-5 text-purple-500" />;
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Lista de anexos */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Anexos</h3>
          <div className="grid grid-cols-1 gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
              >
                {attachment.fileType.startsWith("audio/") ? (
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground truncate mb-1">
                      {attachment.fileName}
                    </p>
                    <AudioPlayer src={attachment.fileUrl} className="w-full" />
                  </div>
                ) : attachment.fileType.startsWith("image/") ? (
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground truncate mb-1">
                      {attachment.fileName}
                    </p>
                    <ProxiedImage src={attachment.fileUrl} className="w-full max-h-48" />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{formatFileSize(attachment.fileSize)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(attachment.uploadedAt)}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {getFileIcon(attachment.fileType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {attachment.fileName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(attachment.fileSize)}</span>
                        <span>•</span>
                        <span>
                          {formatRelativeTime(attachment.uploadedAt)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-1">
                  {showDelete && onAttachmentDeleted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(attachment.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão para adicionar novo anexo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Image className="w-4 h-4 mr-2" />
            Adicionar Anexo
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95%] sm:max-w-lg max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Adicionar Anexo</DialogTitle>
            <DialogDescription>
              Adicione imagens ou áudio como anexo à ocorrência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              accept="image/*,audio/*"
              maxSizeMB={10}
              isUploading={isUploading}
              progress={progress?.percentage}
              selectedFile={selectedFile}
              label="Selecionar foto ou áudio"
              description="PNG, JPEG, WebP, MP3, MP4, OGG, WebM, WAV"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

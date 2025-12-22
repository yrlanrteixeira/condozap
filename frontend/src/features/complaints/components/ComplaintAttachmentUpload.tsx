import { useState } from "react";
import { FileUpload } from "@/shared/components/FileUpload";
import { useComplaintAttachmentUpload } from "@/shared/hooks/useFileUpload";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Image, Music, Trash2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

export function ComplaintAttachmentUpload({
  complaintId,
  attachments = [],
  onAttachmentAdded,
  onAttachmentDeleted,
}: ComplaintAttachmentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

      toast.success("Anexo enviado com sucesso!");
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
      toast.success("Anexo deletado com sucesso!");

      if (onAttachmentDeleted) {
        onAttachmentDeleted(attachmentId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao deletar anexo");
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
          <h3 className="text-sm font-medium text-gray-700">Anexos</h3>
          <div className="grid grid-cols-1 gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {getFileIcon(attachment.fileType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.fileName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(attachment.uploadedAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(attachment.fileUrl, "_blank")}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(attachment.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Anexo</DialogTitle>
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

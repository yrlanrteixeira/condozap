import { useState } from "react";
import { FileUpload } from "@/shared/components/FileUpload";
import { useResidentDocumentUpload } from "@/shared/hooks/useFileUpload";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { FileText, Trash2, Download, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const DOCUMENT_TYPES = {
  RG: "RG",
  CPF: "CPF",
  CNH: "CNH",
  COMPROVANTE_RESIDENCIA: "Comprovante de Residência",
  CONTRATO_LOCACAO: "Contrato de Locação",
  OUTRO: "Outro",
} as const;

const DOCUMENT_STATUS = {
  PENDING: { label: "Pendente", icon: Clock, color: "text-yellow-500" },
  VALIDATING: { label: "Em Validação", icon: Clock, color: "text-blue-500" },
  APPROVED: { label: "Aprovado", icon: CheckCircle, color: "text-green-500" },
  REJECTED: { label: "Rejeitado", icon: XCircle, color: "text-red-500" },
} as const;

interface ResidentDocument {
  id: string;
  residentId: string;
  type: keyof typeof DOCUMENT_TYPES;
  number?: string;
  status: keyof typeof DOCUMENT_STATUS;
  observation?: string;
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ResidentDocumentUploadProps {
  residentId: string;
  documents?: ResidentDocument[];
  onDocumentAdded?: (document: ResidentDocument) => void;
  onDocumentDeleted?: (documentId: string) => void;
}

export function ResidentDocumentUpload({
  residentId,
  documents = [],
  onDocumentAdded,
  onDocumentDeleted,
}: ResidentDocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentType, setDocumentType] = useState<keyof typeof DOCUMENT_TYPES>("RG");
  const [documentNumber, setDocumentNumber] = useState("");
  const [observation, setObservation] = useState("");
  const { uploadFile, isUploading, progress } = useResidentDocumentUpload();

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
        "/uploads/documents",
        {
          residentId,
          documentType,
          documentNumber: documentNumber || undefined,
          observation: observation || undefined,
        }
      );

      toast.success("Documento enviado com sucesso!");
      setSelectedFile(null);
      setDocumentNumber("");
      setObservation("");
      setIsDialogOpen(false);

      if (onDocumentAdded && response.data) {
        onDocumentAdded(response.data);
      }
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Tem certeza que deseja deletar este documento?")) {
      return;
    }

    try {
      await apiClient.delete(`/uploads/documents/${documentId}`);
      toast.success("Documento deletado com sucesso!");

      if (onDocumentDeleted) {
        onDocumentDeleted(documentId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao deletar documento");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Lista de documentos */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Documentos</h3>
          <div className="grid grid-cols-1 gap-2">
            {documents.map((document) => {
              const statusInfo = DOCUMENT_STATUS[document.status];
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={document.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {DOCUMENT_TYPES[document.type]}
                      </p>
                      <span className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                    </div>
                    {document.number && (
                      <p className="text-xs text-gray-500">Nº {document.number}</p>
                    )}
                    {document.observation && (
                      <p className="text-xs text-gray-500 truncate">
                        {document.observation}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(document.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {document.fileUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(document.fileUrl, "_blank")}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(document.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botão para adicionar novo documento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <FileText className="w-4 h-4 mr-2" />
            Adicionar Documento
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="documentType">Tipo de Documento *</Label>
              <Select
                value={documentType}
                onValueChange={(value) => setDocumentType(value as keyof typeof DOCUMENT_TYPES)}
              >
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="documentNumber">Número do Documento</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ex: 12.345.678-9"
              />
            </div>

            <div>
              <Label htmlFor="observation">Observação</Label>
              <Textarea
                id="observation"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Informações adicionais..."
                rows={2}
              />
            </div>

            <FileUpload
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              accept="image/*,application/pdf"
              maxSizeMB={10}
              isUploading={isUploading}
              progress={progress?.percentage}
              selectedFile={selectedFile}
              label="Selecionar arquivo"
              description="PNG, JPEG ou PDF"
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

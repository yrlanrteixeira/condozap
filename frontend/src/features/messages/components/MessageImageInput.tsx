import { useState, useRef } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/shared/components/ui/use-toast';
import { useAppSelector } from '@/shared/hooks';
import { selectCurrentCondominiumId } from '@/shared/store/slices/condominiumSlice';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'video/mp4'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface MessageImageInputProps {
  mediaUrl: string;
  onMediaUrlChange: (url: string) => void;
  caption: string;
  onCaptionChange: (caption: string) => void;
}

export const MessageImageInput = ({
  mediaUrl,
  onMediaUrlChange,
  caption,
  onCaptionChange,
}: MessageImageInputProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const condominiumId = useAppSelector(selectCurrentCondominiumId);

  const handleFileSelect = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: 'Tipo de arquivo não suportado',
        description: 'Use PNG, JPEG, WebP ou MP4.',
        variant: 'error',
        duration: 3000,
      });
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast({
        title: 'Arquivo muito grande',
        description: `O tamanho máximo é ${MAX_SIZE_MB}MB.`,
        variant: 'error',
        duration: 3000,
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (condominiumId) {
        formData.append('condominiumId', condominiumId);
      }

      const response = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha no upload');
      }

      const data = await response.json();
      onMediaUrlChange(data.url);
    } catch {
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar o arquivo. Tente novamente.',
        variant: 'error',
        duration: 3000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = () => {
    onMediaUrlChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isImage = mediaUrl && !mediaUrl.includes('.mp4');

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleInputChange}
      />

      {!mediaUrl ? (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed flex flex-col gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Enviando...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-sm">Clique para anexar imagem ou vídeo</span>
              <span className="text-xs text-muted-foreground">PNG, JPEG, WebP, MP4 — máx. {MAX_SIZE_MB}MB</span>
            </>
          )}
        </Button>
      ) : (
        <div className="relative border rounded-md p-2 bg-muted/30">
          {isImage ? (
            <img src={mediaUrl} alt="Preview" className="max-h-40 rounded object-contain mx-auto" />
          ) : (
            <video src={mediaUrl} className="max-h-40 rounded mx-auto" controls />
          )}
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <Input
        placeholder="Legenda (opcional)"
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
      />
    </div>
  );
};

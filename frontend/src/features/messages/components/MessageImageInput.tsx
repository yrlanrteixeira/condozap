import { Input } from '@/components/ui/input';

interface MessageImageInputProps {
  caption: string;
  onCaptionChange: (caption: string) => void;
}

export const MessageImageInput = ({ caption, onCaptionChange }: MessageImageInputProps) => {
  return (
    <div className="space-y-3">
      <Input placeholder="URL da Imagem (https://...)" value="https://exemplo.com/aviso.jpg" disabled />
      <Input
        placeholder="Legenda (Opcional)"
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
      />
    </div>
  );
};


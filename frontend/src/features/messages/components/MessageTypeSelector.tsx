import { Button } from '@/shared/components/ui/button';

type MsgType = 'text' | 'template' | 'image';

interface MessageTypeSelectorProps {
  msgType: MsgType;
  onTypeChange: (type: MsgType) => void;
}

const MESSAGE_TYPES: { value: MsgType; label: string }[] = [
  { value: 'text', label: 'Texto Livre' },
  { value: 'template', label: 'Template (Oficial)' },
  { value: 'image', label: 'Imagem/Vídeo' },
];

export const MessageTypeSelector = ({ msgType, onTypeChange }: MessageTypeSelectorProps) => {
  return (
    <div className="border-t border-border pt-4">
      <label htmlFor="message-type" className="block text-sm font-medium text-foreground mb-2">
        2. Tipo de Mensagem
      </label>
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4">
        {MESSAGE_TYPES.map((type) => (
          <Button
            key={type.value}
            variant={msgType === type.value ? 'default' : 'outline'}
            onClick={() => onTypeChange(type.value)}
            size="sm"
            className="text-xs sm:text-sm"
          >
            {type.label}
          </Button>
        ))}
      </div>
    </div>
  );
};


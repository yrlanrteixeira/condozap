import { Textarea } from '@/shared/components/ui/textarea';

interface MessageTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const MessageTextInput = ({
  value,
  onChange,
  placeholder = 'Digite sua mensagem aqui...',
}: MessageTextInputProps) => {
  return (
    <Textarea
      id="message-text"
      className="min-h-[100px]"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Conteúdo da mensagem"
    />
  );
};


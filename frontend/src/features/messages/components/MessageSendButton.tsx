import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageSendButtonProps {
  onClick: () => void;
  disabled: boolean;
  isSending: boolean;
}

export const MessageSendButton = ({ onClick, disabled, isSending }: MessageSendButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
    >
      {isSending ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          Enviando...
        </>
      ) : (
        <>
          <Send size={18} className="mr-2" />
          Enviar Mensagem
        </>
      )}
    </Button>
  );
};


import { Users } from 'lucide-react';

interface MessageRecipientCountProps {
  count: number;
}

export const MessageRecipientCount = ({ count }: MessageRecipientCountProps) => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Users size={16} />
      <span>
        {count > 0 ? (
          <>
            <strong className="text-foreground">{count}</strong>{' '}
            {count === 1 ? 'morador receberá' : 'moradores receberão'} esta mensagem
          </>
        ) : (
          <span className="text-destructive">Nenhum destinatário encontrado</span>
        )}
      </span>
    </div>
  );
};


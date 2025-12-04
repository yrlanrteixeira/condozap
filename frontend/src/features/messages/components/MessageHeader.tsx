interface MessageHeaderProps {
  title?: string;
  description?: string;
}

export const MessageHeader = ({
  title = 'Enviar Mensagens',
  description = 'Envie mensagens para moradores do condomínio',
}: MessageHeaderProps) => {
  return (
    <div className="text-center mb-6 sm:mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
    </div>
  );
};


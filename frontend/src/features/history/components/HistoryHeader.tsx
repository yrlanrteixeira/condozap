interface HistoryHeaderProps {
  title?: string;
  description?: string;
}

export const HistoryHeader = ({
  title = 'Logs de Sistema',
  description,
}: HistoryHeaderProps) => {
  return (
    <div className="mb-4 sm:mb-6">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  );
};


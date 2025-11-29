interface ResidentPageHeaderProps {
  title?: string;
  description?: string;
}

export const ResidentPageHeader = ({
  title = "Estrutura do Condomínio",
  description = "Gerencie os moradores e suas unidades",
}: ResidentPageHeaderProps) => {
  return (
    <div className="mb-4 sm:mb-6">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground text-xs sm:text-sm">{description}</p>
    </div>
  );
};

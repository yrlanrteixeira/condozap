import { format, isToday, isYesterday, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateSeparatorProps {
  date: Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  let label: string;

  if (isToday(date)) {
    label = "Hoje";
  } else if (isYesterday(date)) {
    label = "Ontem";
  } else if (isWithinInterval(date, { start: subDays(new Date(), 6), end: new Date() })) {
    label = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  } else {
    label = format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className="text-center my-3">
      <span className="inline-block rounded-full bg-muted/50 text-[11px] text-muted-foreground px-3 py-1">
        {formattedLabel}
      </span>
    </div>
  );
}
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export type Period = "7d" | "30d" | "90d" | "1y";

interface PeriodSelectorProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

const PERIODS: Record<Period, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  "1y": "Último ano",
};

export function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  return (
    <Select value={period} onValueChange={onPeriodChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecione o período" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PERIODS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Alias for compatibility
export const DashboardPeriodSelector = PeriodSelector;
export type { Period as DashboardPeriod };


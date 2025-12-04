import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({
  title,
  value,
  icon,
  iconBgColor = "bg-primary/10",
  iconColor = "text-primary",
  subtitle,
  trend,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && (
          <div className={cn("p-2 rounded-lg", iconBgColor, iconColor)}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            <span
              className={cn(
                "font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-muted-foreground ml-2">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Alias for compatibility
export const DashboardStatCard = StatCard;


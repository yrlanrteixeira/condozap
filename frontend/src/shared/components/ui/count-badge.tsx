import { cn } from "@/lib/utils";

interface CountBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

const variantClasses = {
  default: "bg-muted text-muted-foreground",
  success: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

export function CountBadge({
  count,
  max = 99,
  showZero = false,
  variant = "default",
  className,
}: CountBadgeProps) {
  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {displayCount}
    </span>
  );
}

interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

export function NotificationBadge({
  count,
  max = 9,
  className,
}: NotificationBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center",
        className
      )}
    >
      {displayCount}
    </span>
  );
}
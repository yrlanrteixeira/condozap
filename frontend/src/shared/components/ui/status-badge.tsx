import { cn } from "@/lib/utils";
import { Badge, BadgeProps } from "./badge";

type StatusVariant = "default" | "success" | "warning" | "error" | "info" | "secondary";

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  variant?: StatusVariant;
  dot?: boolean;
}

const variantConfig: Record<StatusVariant, { bg: string; text: string; dot: string }> = {
  default: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  success: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  warning: { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500" },
  error: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  info: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  secondary: { bg: "bg-secondary", text: "text-secondary-foreground", dot: "bg-secondary-foreground" },
};

export function StatusBadge({
  variant = "default",
  dot = false,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const config = variantConfig[variant];

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bg,
        config.text,
        "border-transparent",
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", config.dot)} />
      )}
      {children}
    </Badge>
  );
}

interface StatusOption {
  value: string;
  label: string;
  variant: StatusVariant;
}

interface StatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: StatusOption[];
  placeholder?: string;
  className?: string;
}

export function StatusSelect({
  value,
  onValueChange,
  options,
  placeholder = "Status",
  className,
}: StatusSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-200",
        className
      )}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
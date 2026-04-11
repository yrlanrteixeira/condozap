import { LucideIcon, Info, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  icon?: LucideIcon;
}

const variantConfig = {
  info: {
    icon: Info,
    containerClass: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
    iconClass: "text-blue-500",
    titleClass: "text-blue-900 dark:text-blue-100",
    textClass: "text-blue-700 dark:text-blue-300",
  },
  success: {
    icon: CheckCircle2,
    containerClass: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
    iconClass: "text-green-500",
    titleClass: "text-green-900 dark:text-green-100",
    textClass: "text-green-700 dark:text-green-300",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
    iconClass: "text-yellow-500",
    titleClass: "text-yellow-900 dark:text-yellow-100",
    textClass: "text-yellow-700 dark:text-yellow-300",
  },
  error: {
    icon: AlertCircle,
    containerClass: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
    iconClass: "text-red-500",
    titleClass: "text-red-900 dark:text-red-100",
    textClass: "text-red-700 dark:text-red-300",
  },
};

export function Alert({
  variant = "info",
  title,
  icon,
  className,
  children,
  ...props
}: AlertProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        config.containerClass,
        className
      )}
      {...props}
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.iconClass)} />
      <div className="flex-1">
        {title && (
          <h4 className={cn("font-medium mb-1", config.titleClass)}>{title}</h4>
        )}
        <div className={cn("text-sm", config.textClass)}>{children}</div>
      </div>
    </div>
  );
}
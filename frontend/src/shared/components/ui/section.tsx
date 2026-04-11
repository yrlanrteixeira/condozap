import { cn } from "@/lib/utils";

interface SectionProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  divider?: boolean;
}

export function Section({
  title,
  description,
  action,
  children,
  className,
  divider = false,
}: SectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      
      {children}
      
      {divider && <div className="border-t" />}
    </section>
  );
}

interface FieldSetProps {
  legend?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldSet({
  legend,
  description,
  children,
  className,
}: FieldSetProps) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      {legend && (
        <legend className="text-sm font-medium text-foreground">
          {legend}
        </legend>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
    </fieldset>
  );
}
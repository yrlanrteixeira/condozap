import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface CardWithActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function CardWithActions({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: CardWithActionsProps) {
  return (
    <Card className={cn("", className)} {...props}>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
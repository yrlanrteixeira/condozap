import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  containerClassName?: string;
}

const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, containerClassName, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full overflow-auto",
          "-mx-4 px-4 sm:-mx-6 sm:px-6",
          "[&::-webkit-scrollbar]:h-2",
          "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          containerClassName
        )}
        {...props}
      >
        <div className="min-w-[800px]">
          {children}
        </div>
      </div>
    );
  }
);
ResponsiveTable.displayName = "ResponsiveTable";

export { ResponsiveTable };
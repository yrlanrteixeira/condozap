import * as React from "react";
import { Tabs as TabsPrimitive, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface TabsWithCountsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export function TabsWithCounts({
  tabs,
  value,
  onValueChange,
  children,
  className,
}: TabsWithCountsProps) {
  return (
    <TabsPrimitive value={value} onValueChange={onValueChange} className={className}>
      <TabsList className="w-full justify-start overflow-x-auto">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className="gap-2"
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  value === tab.id
                    ? "bg-primary/10 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </TabsPrimitive>
  );
}
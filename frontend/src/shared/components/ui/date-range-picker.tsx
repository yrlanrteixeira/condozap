import { useState } from "react";
import { Calendar, X } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Selecione o período",
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [from, setFrom] = useState(value?.from || "");
  const [to, setTo] = useState(value?.to || "");

  const hasValue = value?.from && value?.to;

  const handleApply = () => {
    if (from && to) {
      onChange({ from, to });
    } else if (!from && !to) {
      onChange(undefined);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setFrom("");
    setTo("");
    onChange(undefined);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "justify-start text-left font-normal gap-2",
          !hasValue && "text-muted-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="h-4 w-4" />
        {hasValue ? (
          <span>
            {new Date(from).toLocaleDateString("pt-BR")} -{" "}
            {new Date(to).toLocaleDateString("pt-BR")}
          </span>
        ) : (
          <span>{placeholder}</span>
        )}
        {hasValue && (
          <X
            className="h-3 w-3 ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-2 z-50 bg-card border rounded-lg shadow-lg p-4 w-72">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">De</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleClear}
              >
                Limpar
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={handleApply}
                disabled={!from || !to}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
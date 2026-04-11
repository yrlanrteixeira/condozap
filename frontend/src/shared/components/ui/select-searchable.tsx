import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Button } from "./button";
import { Input } from "./input";

interface SelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhuma opção encontrada",
  disabled,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearch("");
    }
  };

  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value && selectedLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="p-0">
        <div className="flex items-center gap-2 p-2 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setSearch("");
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="cursor-pointer"
              >
                {option.label}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}
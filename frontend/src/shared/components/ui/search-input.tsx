import { Search, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch: (value: string) => void;
  debounceMs?: number;
  loading?: boolean;
  onClear?: () => void;
}

export function SearchInput({
  onSearch,
  debounceMs = 300,
  loading,
  onClear,
  className,
  ...props
}: SearchInputProps) {
  const [value, setValue] = useState(props.value?.toString() || "");

  useEffect(() => {
    setValue(props.value?.toString() || "");
  }, [props.value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== props.value) {
        onSearch(value);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch, props.value]);

  const handleClear = useCallback(() => {
    setValue("");
    onClear?.();
    onSearch("");
  }, [onClear, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        {...props}
        className={cn("pl-9 pr-8", className)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {(value || loading) && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={handleClear}
        >
          {loading ? (
            <span className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}
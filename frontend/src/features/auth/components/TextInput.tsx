import { forwardRef } from "react"
import { GlassInputWrapper } from "./GlassInputWrapper"

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  helperText?: string
  label: string
  icon?: React.ReactNode
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, helperText, label, icon, className = "", ...props }, ref) => {
    return (
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-muted-foreground block mb-1">
          {label}
        </label>
        <GlassInputWrapper>
          <div className="relative flex items-center">
            {icon && (
              <span className="absolute left-3 flex items-center text-gray-400">
                {icon}
              </span>
            )}
            <input
              ref={ref}
              className={`w-full bg-transparent text-sm text-foreground py-3 rounded-lg focus:outline-none ${icon ? "pl-10 pr-4" : "px-4"} ${className}`}
              {...props}
            />
          </div>
        </GlassInputWrapper>
        {helperText && !error && (
          <p className="text-xs text-muted-foreground mt-1">
            {helperText}
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive mt-1">
            {error}
          </p>
        )}
      </div>
    )
  }
)

TextInput.displayName = "TextInput"

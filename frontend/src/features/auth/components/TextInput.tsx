import { forwardRef } from "react"
import { GlassInputWrapper } from "./GlassInputWrapper"

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  helperText?: string
  label: string
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, helperText, label, className = "", ...props }, ref) => {
    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
        <GlassInputWrapper>
          <input
            ref={ref}
            className={`w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none ${className}`}
            {...props}
          />
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

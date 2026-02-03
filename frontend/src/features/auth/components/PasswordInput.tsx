import { useState, forwardRef } from "react"
import { Eye, EyeOff } from "lucide-react"
import { GlassInputWrapper } from "./GlassInputWrapper"

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  helperText?: string
  label?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ error, helperText, label = "Senha", className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
        <GlassInputWrapper>
          <div className="relative">
            <input
              ref={ref}
              type={showPassword ? "text" : "password"}
              className={`w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none ${className}`}
              {...props}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
              ) : (
                <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
              )}
            </button>
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

PasswordInput.displayName = "PasswordInput"

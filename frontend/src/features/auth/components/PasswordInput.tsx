import { useState, forwardRef } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { GlassInputWrapper } from "./GlassInputWrapper"

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  helperText?: string
  label?: string
  icon?: React.ReactNode
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ error, helperText, label = "Senha", icon, className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-muted-foreground block mb-1">
          {label}
        </label>
        <GlassInputWrapper>
          <div className="relative flex items-center">
            <span className="absolute left-3 flex items-center text-gray-400">
              {icon ?? <Lock className="w-4 h-4" />}
            </span>
            <input
              ref={ref}
              type={showPassword ? "text" : "password"}
              className={`w-full bg-transparent text-sm text-foreground py-3 pl-10 pr-12 rounded-lg focus:outline-none ${className}`}
              {...props}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
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

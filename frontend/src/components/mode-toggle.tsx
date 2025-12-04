import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const checkDarkMode = () => {
      if (theme === "dark") {
        setIsDark(true);
      } else if (theme === "light") {
        setIsDark(false);
      } else {
        setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    };

    checkDarkMode();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        checkDarkMode();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-10 w-20 items-center rounded-full border-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isDark ? "border-primary bg-primary" : "border-primary/30 bg-muted"
      )}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      {/* Background icons - Sol à esquerda, Lua à direita */}
      <div className="flex w-full items-center justify-between px-2 pointer-events-none">
        <Sun
          className={cn(
            "h-4 w-4 transition-opacity duration-300",
            isDark ? "opacity-30" : "opacity-100 text-yellow-500"
          )}
        />
        <Moon
          className={cn(
            "h-4 w-4 transition-opacity duration-300",
            isDark ? "opacity-100 text-background" : "opacity-30"
          )}
        />
      </div>

      {/* Slider circle que desliza */}
      <span
        className={cn(
          "absolute flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-lg transition-transform duration-300 ease-in-out",
          isDark ? "translate-x-11" : "translate-x-1"
        )}
      >
        {/* Ícone no círculo - mostra o oposto do estado atual */}
        {isDark ? (
          <Moon className="h-4 w-4 text-primary" />
        ) : (
          <Sun className="h-4 w-4 text-yellow-500" />
        )}
      </span>
    </button>
  );
}

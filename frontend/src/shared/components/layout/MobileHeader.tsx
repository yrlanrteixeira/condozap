import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts";
import { ModeToggle } from "@/components/mode-toggle";
import type { View } from "@/types";

const VIEW_LABELS: Record<View, string> = {
  dashboard: "Visão Geral",
  messages: "Mensagens",
  structure: "Estrutura",
  complaints: "Ocorrências",
  history: "Logs do Sistema",
  unified_dashboard: "Visão Geral",
};

export function MobileHeader() {
  const { setMobileMenuOpen, view } = useApp();

  return (
    <header className="md:hidden bg-background border-b p-4 shadow-sm flex items-center justify-between">
      <div>
        <h1 className="font-bold text-lg">TalkZap</h1>
        <p className="text-xs text-muted-foreground">{VIEW_LABELS[view]}</p>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu />
        </Button>
      </div>
    </header>
  );
}

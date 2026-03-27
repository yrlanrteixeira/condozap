import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OnboardingSteps } from "../hooks/useOnboarding";

const DISMISSED_KEY = "onboarding_checklist_dismissed";

interface ChecklistItem {
  key: keyof OnboardingSteps;
  label: string;
  href: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    key: "structureConfigured",
    label: "Configurar estrutura do condomínio",
    href: "/structure",
  },
  {
    key: "sectorCreated",
    label: "Criar pelo menos 1 setor",
    href: "/structure",
  },
  {
    key: "residentCreated",
    label: "Cadastrar primeiro morador",
    href: "/residents",
  },
  {
    key: "messageSent",
    label: "Enviar primeira mensagem",
    href: "/messages",
  },
  {
    key: "complaintHandled",
    label: "Gerenciar primeira ocorrência",
    href: "/complaints",
  },
];

interface OnboardingChecklistProps {
  steps: OnboardingSteps;
}

export function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  if (dismissed) {
    return null;
  }

  const completedCount = CHECKLIST_ITEMS.filter(
    (item) => steps[item.key]
  ).length;
  const totalCount = CHECKLIST_ITEMS.length;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // ignore storage errors
    }
    setDismissed(true);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold">
              Configuracao inicial
            </CardTitle>
            <Badge variant="secondary" className="shrink-0">
              {completedCount} de {totalCount} etapas concluidas
            </Badge>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ul className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const completed = steps[item.key];
            return (
              <li key={item.key} className="flex items-center gap-3">
                {completed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {completed ? (
                  <span
                    className={cn(
                      "text-sm",
                      "line-through text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

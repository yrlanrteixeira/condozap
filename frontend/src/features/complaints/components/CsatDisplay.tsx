import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CsatDisplayProps {
  score: number | null;
  comment: string | null;
  respondedAt: string | null;
}

export function CsatDisplay({ score, comment, respondedAt }: CsatDisplayProps) {
  if (score === null) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm text-muted-foreground">Aguardando avaliacao</p>
      </div>
    );
  }

  const timeAgo = respondedAt
    ? formatDistanceToNow(new Date(respondedAt), { addSuffix: true, locale: ptBR })
    : null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <p className="text-sm font-medium text-foreground">Avaliacao do Morador</p>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => {
            const filled = i < score;
            return (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  filled
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
            );
          })}
        </div>
        <span className="text-sm font-semibold text-foreground">
          {score}/5
        </span>
        {timeAgo && (
          <span className="text-xs text-muted-foreground ml-auto">
            {timeAgo}
          </span>
        )}
      </div>

      {comment && (
        <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
          "{comment}"
        </p>
      )}
    </div>
  );
}

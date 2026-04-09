import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { Announcement } from "../types";

interface AnnouncementsCarouselProps {
  announcements: Announcement[];
  className?: string;
}

export function AnnouncementsCarousel({
  announcements,
  className,
}: AnnouncementsCarouselProps) {
  const [index, setIndex] = useState(0);
  const total = announcements.length;

  // Lista pode encolher (refetch) mantendo index antigo — evita current undefined.
  useEffect(() => {
    if (total === 0) return;
    setIndex((i) => Math.min(i, total - 1));
  }, [total]);

  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;

  const goPrev = useCallback(() => {
    setIndex((i) => {
      const iSafe = total > 0 ? Math.min(i, total - 1) : 0;
      return iSafe <= 0 ? total - 1 : iSafe - 1;
    });
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      const iSafe = total > 0 ? Math.min(i, total - 1) : 0;
      return iSafe >= total - 1 ? 0 : iSafe + 1;
    });
  }, [total]);

  if (total === 0) {
    return null;
  }

  const current = announcements[safeIndex];

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Novidades da semana"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Novidades da semana
        </h2>
      </div>

      <div className="relative flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={goPrev}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <Card className="border-border overflow-hidden">
            <CardContent className="p-4">
              {current?.imageUrl && (
                <div className="mb-3 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={current.imageUrl}
                    alt=""
                    className="w-full h-36 object-cover"
                  />
                </div>
              )}
              <h3 className="font-semibold text-foreground mb-1">
                {current?.title}
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {current?.content}
              </p>
            </CardContent>
          </Card>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={goNext}
          aria-label="Próxima"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {total > 1 && (
        <div className="flex justify-center gap-1.5" role="tablist">
          {announcements.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Novidade ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                i === safeIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

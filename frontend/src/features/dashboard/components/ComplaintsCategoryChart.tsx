import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { BarChart3 } from "lucide-react";

interface CategoryData {
  name: string;
  count: number;
}

interface ComplaintsCategoryChartProps {
  categories: CategoryData[];
  totalComplaints: number;
}

export function ComplaintsCategoryChart({
  categories,
  totalComplaints,
}: ComplaintsCategoryChartProps) {
  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          Ocorrências por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma ocorrência registrada
            </p>
          ) : (
            categories.map((category) => {
              const percentage =
                totalComplaints > 0
                  ? Math.round((category.count / totalComplaints) * 100)
                  : 0;
              const barWidth = (category.count / maxCount) * 100;

              return (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">
                      {category.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}


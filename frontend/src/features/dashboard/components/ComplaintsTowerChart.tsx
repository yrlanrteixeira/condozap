import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Building2 } from "lucide-react";

interface ComplaintsTowerChartProps {
  complaintsByTower: Record<string, number>;
  totalComplaints: number;
}

export function ComplaintsTowerChart({
  complaintsByTower,
  totalComplaints,
}: ComplaintsTowerChartProps) {
  const towers = Object.entries(complaintsByTower)
    .map(([tower, count]) => ({ tower, count }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...towers.map((t) => t.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5" />
          Ocorrências por Torre
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {towers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma torre cadastrada
            </p>
          ) : (
            towers.map(({ tower, count }) => {
              const percentage =
                totalComplaints > 0
                  ? Math.round((count / totalComplaints) * 100)
                  : 0;
              const barWidth = (count / maxCount) * 100;

              return (
                <div key={tower} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Torre {tower}</span>
                    <span className="text-muted-foreground">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
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


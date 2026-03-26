import { Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

interface ComplaintsByTowerChartProps {
  complaintsByTower: Record<string, number>
  totalComplaints: number
}

export function ComplaintsByTowerChart({ 
  complaintsByTower, 
  totalComplaints 
}: ComplaintsByTowerChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Building className="text-warning" size={20} />
          Ocorrências por Torre
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4 sm:gap-8 h-48 pb-2 border-b border-border justify-center overflow-x-auto">
          {Object.entries(complaintsByTower).map(([tower, count]) => (
            <div key={tower} className="flex flex-col items-center gap-2 group flex-shrink-0">
              <div
                className="relative w-12 sm:w-16 bg-primary/15 rounded-t-lg transition-all duration-500 group-hover:bg-primary/25 flex items-end justify-center"
                style={{
                  height: `${totalComplaints > 0 ? (count / totalComplaints) * 100 : 0}%`,
                  minHeight: '20px',
                }}
              >
                <span className="mb-2 font-bold text-primary">{count}</span>
              </div>
              <span className="text-sm font-bold text-muted-foreground">Torre {tower}</span>
            </div>
          ))}
          {Object.keys(complaintsByTower).length === 0 && (
            <div className="text-muted-foreground text-sm self-center">
              Sem dados suficientes
            </div>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Comparativo de volume de chamados entre torres
        </p>
      </CardContent>
    </Card>
  )
}


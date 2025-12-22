import { PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

interface CategoryData {
  name: string
  count: number
}

interface ComplaintsByCategoryChartProps {
  categories: CategoryData[]
  totalComplaints: number
}

export function ComplaintsByCategoryChart({ 
  categories, 
  totalComplaints 
}: ComplaintsByCategoryChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <PieChart className="text-purple-500" size={20} />
          Tipos de Reclamação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((item) => (
          <div key={item.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground font-medium">{item.name}</span>
              <span className="text-foreground font-bold">{item.count}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${totalComplaints > 0 ? (item.count / totalComplaints) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}


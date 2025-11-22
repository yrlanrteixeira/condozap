import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Resident } from '@/types'

interface StructurePanelProps {
  residents: Resident[]
}

export function StructurePanel({ residents }: StructurePanelProps) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Estrutura do Condomínio
      </h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Torre</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-slate-500">{r.phone}</TableCell>
                  <TableCell>{r.tower}</TableCell>
                  <TableCell>{r.unit}</TableCell>
                  <TableCell>
                    <Button variant="link" className="text-blue-600 p-0 h-auto">
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 border-t">
            <Button variant="ghost" className="text-green-600 font-bold">
              + Adicionar Novo Morador
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

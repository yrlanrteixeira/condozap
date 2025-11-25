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
    <div className="p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 sm:mb-6">
        Estrutura do Condomínio
      </h2>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nome</TableHead>
                <TableHead className="whitespace-nowrap">Telefone</TableHead>
                <TableHead className="whitespace-nowrap">Torre</TableHead>
                <TableHead className="whitespace-nowrap">Unidade</TableHead>
                <TableHead className="whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                  <TableCell className="font-mono text-slate-500 whitespace-nowrap">{r.phone}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.tower}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.unit}</TableCell>
                  <TableCell className="whitespace-nowrap">
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

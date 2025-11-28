import { Building2, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApp } from '@/contexts'
import { cn } from '@/lib/utils'

export function CondoSwitcher() {
  const {
    currentCondominiumId,
    setCurrentCondominiumId,
    getCurrentCondominium,
    getAccessibleCondominiums,
    isProfessionalSyndic,
  } = useApp()

  const currentCondo = getCurrentCondominium()
  const accessibleCondos = getAccessibleCondominiums()

  // Se não é síndico profissional com múltiplos condomínios, não mostra o switcher
  if (!isProfessionalSyndic() || accessibleCondos.length <= 1) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Trocar condomínio"
          className="w-full justify-between h-auto py-2"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 size={16} className="flex-shrink-0" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-semibold truncate w-full">
                {currentCondo?.name || 'Selecione um condomínio'}
              </span>
              {currentCondo && (
                <span className="text-xs text-muted-foreground truncate w-full">
                  CNPJ: {currentCondo.cnpj}
                </span>
              )}
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Trocar de Condomínio</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accessibleCondos.map((condo) => (
          <DropdownMenuItem
            key={condo.id}
            onClick={() => setCurrentCondominiumId(condo.id)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="font-medium truncate">{condo.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {condo.address}
                </span>
              </div>
              {currentCondominiumId === condo.id && (
                <Check className="ml-2 h-4 w-4 flex-shrink-0" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setCurrentCondominiumId(null)}
          className="cursor-pointer font-medium text-primary"
        >
          <Building2 className="mr-2 h-4 w-4" />
          Ver Dashboard Unificado
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="md:hidden bg-white p-4 shadow-sm flex items-center justify-between">
      <h1 className="font-bold text-lg">CondoZap</h1>
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu />
      </Button>
    </header>
  )
}

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts'
import { ModeToggle } from '@/components/mode-toggle'

export function MobileHeader() {
  const { setMobileMenuOpen } = useApp()

  return (
    <header className="md:hidden bg-background border-b p-4 shadow-sm flex items-center justify-between">
      <h1 className="font-bold text-lg">CondoZap</h1>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
          <Menu />
        </Button>
      </div>
    </header>
  )
}

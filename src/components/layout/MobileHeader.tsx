import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts'

export function MobileHeader() {
  const { setMobileMenuOpen } = useApp()

  return (
    <header className="md:hidden bg-white p-4 shadow-sm flex items-center justify-between">
      <h1 className="font-bold text-lg">CondoZap</h1>
      <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
        <Menu />
      </Button>
    </header>
  )
}

import { HomePage } from '@/pages'
import { AppProvider } from '@/contexts'
import { ThemeProvider } from '@/components/theme-provider'

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="condozap-ui-theme">
      <AppProvider>
        <HomePage />
      </AppProvider>
    </ThemeProvider>
  )
}

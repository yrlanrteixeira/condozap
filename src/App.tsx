import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { HomePage } from '@/pages'
import { AppProvider } from '@/contexts'
import { ThemeProvider } from '@/components/theme-provider'
import { store, persistor } from '@/store'
import { queryClient } from '@/lib/queryClient'

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system" storageKey="condozap-ui-theme">
            <AppProvider>
              <HomePage />
            </AppProvider>
          </ThemeProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  )
}

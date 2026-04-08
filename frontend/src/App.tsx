import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Loader2 } from "lucide-react";
import { AppProvider } from "@/shared/contexts";
import { ThemeProvider } from "@/shared/components/theme-provider";
import { Toaster } from "@/shared/components/ui/toaster";
import { store, persistor } from "@/shared/store";
import { setReduxStore } from "@/lib/api-client";
import { setApiStore } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { AppRoutes } from "@/routes";

setReduxStore(store);
setApiStore(store);

// Loading fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingFallback />} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system" storageKey="talkzap-ui-theme">
            <BrowserRouter>
              <AppProvider>
                <AppRoutes />
                <Toaster />
              </AppProvider>
            </BrowserRouter>
            {import.meta.env.DEV && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { router } from './router';
import { useAuthStore } from './stores/auth.store';
import { setupAxiosOfflineInterceptor } from './lib/axios-setup';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/sonner';
import './index.css';

setupAxiosOfflineInterceptor();

/** Pull a human message out of an axios/API error. */
function errorMessage(error: unknown): string {
  const e = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = e?.response?.data?.message;

  if (Array.isArray(m)) return m.join(', ');

  return m || e?.message || 'Something went wrong';
}

const queryClient = new QueryClient({
  // No-silent-failures: any write that doesn't handle its own onError surfaces a toast.
  // (A mutation with its own onError opts out, so we don't double-toast — see order builder.)
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.options.onError) return;
      toast.error(errorMessage(error));
    },
  }),
  defaultOptions: {
    // Reads retry a couple times on a wifi blip; writes NEVER auto-retry
    // (no idempotency keys — a retried POST /payments or /orders would double-charge/duplicate).
    // ponytail: true offline mutation queue exists in lib/offline-queue (drains on reconnect); retry:0 here is the online-safety half.
    queries: { retry: 2, retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000) },
    mutations: { retry: 0 },
  },
});

function Root() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ auth: { isAuthenticated, user } }} />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed in index.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </StrictMode>,
);

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

// ─── QueryProvider ────────────────────────────────────────────────────────────
//
// Envuelve la app con React Query para las páginas del módulo empresarial.
// Se crea el QueryClient dentro del componente para que sea por sesión (SSR safe).

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime:   60_000, // 1 minuto
          retry:       1,
          refetchOnWindowFocus: false,
        },
      },
    }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

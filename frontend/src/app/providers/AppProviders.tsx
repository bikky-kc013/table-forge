import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/domain/entities/error.js';
import { ThemeProvider } from './ThemeProvider.js';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, err) => {
          if (err instanceof ApiError && (err.isAuth() || err.status === 403)) return false;
          return count < 1;
        },
        refetchOnWindowFocus: false,
        gcTime: 5 * 60 * 1000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

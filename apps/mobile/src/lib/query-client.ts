// Shared QueryClient instance for TanStack React Query
// Configured with sensible mobile defaults (longer staleTime, retry on reconnect)

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,       // 1 minute — reduce refetches on mobile
      retry: 2,
      refetchOnWindowFocus: false, // Not applicable on mobile
    },
  },
});

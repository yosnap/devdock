// React context that provides IApiClient to all shared hooks
// Each app (desktop/web/mobile) wraps its root with ApiClientProvider

import { createContext, useContext, type ReactNode } from 'react';
import type { IApiClient } from '@devdock/api-client';

const ApiClientContext = createContext<IApiClient | null>(null);

export function ApiClientProvider({
  client,
  children,
}: {
  client: IApiClient;
  children: ReactNode;
}) {
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

export function useApiClient(): IApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used within ApiClientProvider');
  }
  return client;
}

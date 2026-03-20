/// Wraps children with ApiClientProvider using HttpApiClient + supabase client.
/// Must be rendered inside the auth session context so the client has credentials.
import type { ReactNode } from 'react';
import { HttpApiClient } from '@devdock/api-client';
import { ApiClientProvider } from '@devdock/hooks';
import { supabase } from './supabase';

const httpClient = new HttpApiClient(supabase);

export function WebApiProvider({ children }: { children: ReactNode }) {
  return (
    <ApiClientProvider client={httpClient}>
      {children}
    </ApiClientProvider>
  );
}

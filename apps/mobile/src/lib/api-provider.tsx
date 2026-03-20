// Wraps ApiClientProvider with the mobile HttpApiClient (backed by supabase)
// Import this in the root layout to make useApiClient() available everywhere

import { ApiClientProvider } from '@devdock/hooks';
import { HttpApiClient } from '@devdock/api-client';
import { supabase } from './supabase';
import type { ReactNode } from 'react';

const apiClient = new HttpApiClient(supabase);

export function MobileApiProvider({ children }: { children: ReactNode }) {
  return <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>;
}

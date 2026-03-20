import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { WebApiProvider } from './lib/api-provider';
import { router } from './router';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WebApiProvider>
        <RouterProvider router={router} />
      </WebApiProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

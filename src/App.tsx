import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/app-layout';
import { useTheme } from './hooks/use-theme';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const BASE_TOKEN = {
  colorPrimary: '#1677ff',
  borderRadius: 6,
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
};

function ThemedApp() {
  const { effectiveTheme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: effectiveTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: BASE_TOKEN,
      }}
    >
      <AntApp>
        <AppLayout />
      </AntApp>
    </ConfigProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemedApp />
    </QueryClientProvider>
  );
}

export default App;

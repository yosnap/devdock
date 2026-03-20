/// Root layout — Ant Design Sider + Content with theme provider.
/// Search state lives here and is passed down via context/props to pages.
import { App as AntApp, ConfigProvider, Layout, theme as antdTheme } from 'antd';
import { createContext, useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useWebTheme } from '../../hooks/use-web-theme';
import { WebSidebar } from './web-sidebar';
import { WebTopBar } from './web-top-bar';

const { Sider, Content, Header } = Layout;

const SIDEBAR_WIDTH = 220;
const BASE_TOKEN = {
  colorPrimary: '#1677ff',
  borderRadius: 6,
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
};

// Search context so pages can read the top-bar search value
interface SearchCtx { search: string }
const SearchContext = createContext<SearchCtx>({ search: '' });
export function useLayoutSearch() { return useContext(SearchContext); }

export function WebAppLayout() {
  const { effectiveTheme } = useWebTheme();
  const [search, setSearch] = useState('');

  return (
    <ConfigProvider
      theme={{
        algorithm: effectiveTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: BASE_TOKEN,
      }}
    >
      <AntApp>
        <SearchContext.Provider value={{ search }}>
          <Layout style={{ height: '100vh', overflow: 'hidden' }}>
            <Sider
              width={SIDEBAR_WIDTH}
              theme={effectiveTheme}
              style={{ borderRight: '1px solid var(--border-color)', overflow: 'auto' }}
            >
              <WebSidebar />
            </Sider>

            <Layout>
              <Header style={{ padding: 0, height: 'auto', lineHeight: 'normal', background: 'transparent' }}>
                <WebTopBar search={search} onSearchChange={setSearch} />
              </Header>
              <Content style={{ overflow: 'auto' }}>
                <Outlet />
              </Content>
            </Layout>
          </Layout>
        </SearchContext.Provider>
      </AntApp>
    </ConfigProvider>
  );
}

/// Web sidebar navigation — Projects, Workspaces, Notes, Health, Settings links.
import {
  AppstoreOutlined,
  FileTextOutlined,
  HeartOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Divider, Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

const { Text } = Typography;

const NAV_ITEMS: MenuProps['items'] = [
  { key: '/', icon: <AppstoreOutlined />, label: 'Projects' },
  { key: '/workspaces', icon: <TeamOutlined />, label: 'Workspaces' },
  { key: '/notes', icon: <FileTextOutlined />, label: 'Notes' },
  { key: '/health', icon: <HeartOutlined />, label: 'Health' },
];

const BOTTOM_ITEMS: MenuProps['items'] = [
  { key: '/settings/profile', icon: <SettingOutlined />, label: 'Settings' },
];

export function WebSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Derive selected key: settings sub-paths → /settings/profile
  const selectedKey = pathname.startsWith('/settings')
    ? '/settings/profile'
    : pathname.startsWith('/notes/')
    ? '/notes'
    : pathname;

  function handleSelect({ key }: { key: string }) {
    navigate(key);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>
        DevDock
      </div>
      <Text type="secondary" style={{ paddingLeft: 16, fontSize: 11, marginBottom: 8 }}>
        Web
      </Text>

      <Divider style={{ margin: '0 0 8px' }} />

      {/* Main nav */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        onSelect={handleSelect}
        items={NAV_ITEMS}
        style={{ flex: 1, border: 'none', overflow: 'auto' }}
      />

      <Divider style={{ margin: '8px 0 0' }} />

      {/* Settings at bottom */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        onSelect={handleSelect}
        items={BOTTOM_ITEMS}
        style={{ border: 'none', paddingBottom: 8 }}
      />
    </div>
  );
}

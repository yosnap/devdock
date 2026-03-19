import {
  AppstoreOutlined,
  ExclamationCircleOutlined,
  FolderOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button, Divider, Menu, Typography } from 'antd';
import { useWorkspaces } from '../../queries/use-workspaces-query';
import { useAppStore } from '../../stores/app-store';

const { Text } = Typography;

export function Sidebar() {
  const { activeWorkspaceId, setActiveWorkspaceId, activeView, setActiveView, setWorkspaceModalOpen } = useAppStore();
  const { data: workspaces = [] } = useWorkspaces();

  const workspaceItems = workspaces.map((ws) => ({
    key: ws.id,
    icon: <FolderOutlined style={{ color: ws.color ?? '#1677ff' }} />,
    label: ws.name,
  }));

  const menuItems = [
    {
      key: 'all',
      icon: <AppstoreOutlined />,
      label: 'All Projects',
    },
    {
      key: 'attention',
      icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      label: 'Needs Attention',
    },
    ...(workspaceItems.length > 0
      ? [
          { type: 'divider' as const },
          {
            key: 'workspaces-group',
            label: (
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                Workspaces
              </Text>
            ),
            type: 'group' as const,
            children: workspaceItems,
          },
        ]
      : []),
  ];

  const selectedKey =
    activeView === 'settings' ? 'settings' :
    activeView === 'attention' ? 'attention' :
    (activeWorkspaceId ?? 'all');

  function handleSelect({ key }: { key: string }) {
    if (key === 'settings') {
      setActiveView('settings');
    } else if (key === 'attention') {
      setActiveView('attention');
    } else {
      setActiveView('dashboard');
      setActiveWorkspaceId(key === 'all' ? null : key);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>
        DevDock
      </div>

      <Divider style={{ margin: '0 0 8px' }} />

      {/* Main nav */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        onSelect={handleSelect}
        items={menuItems}
        style={{ flex: 1, border: 'none', overflow: 'auto' }}
      />

      <Divider style={{ margin: '8px 0 0' }} />

      {/* Bottom actions */}
      <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Button
          type="text"
          icon={<PlusOutlined />}
          style={{ textAlign: 'left', width: '100%' }}
          onClick={() => setWorkspaceModalOpen(true)}
        >
          New Workspace
        </Button>
        <Button
          type={activeView === 'settings' ? 'default' : 'text'}
          icon={<SettingOutlined />}
          style={{ textAlign: 'left', width: '100%' }}
          onClick={() => setActiveView('settings')}
        >
          Settings
        </Button>
      </div>
    </div>
  );
}

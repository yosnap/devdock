import {
  AppstoreOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Badge, Button, Divider, Menu, Typography } from 'antd';
import { useMemo } from 'react';
import { useProjects, useWorkspaces } from '@devdock/hooks';
import { useAppStore } from '../../stores/app-store';
import { WorkspaceIcon } from '../workspaces/workspace-icon';

const { Text } = Typography;

export function Sidebar() {
  const { activeWorkspaceId, setActiveWorkspaceId, activeView, setActiveView, setWorkspaceModalOpen } = useAppStore();
  const { data: workspaces = [] } = useWorkspaces();
  const { data: projects = [] } = useProjects();

  const projectCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach((p) => {
      if (p.workspace_id) map[p.workspace_id] = (map[p.workspace_id] ?? 0) + 1;
    });
    return map;
  }, [projects]);

  const workspaceItems = workspaces.map((ws) => ({
    key: ws.id,
    icon: <WorkspaceIcon workspace={ws} size={20} />,
    label: (
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{ws.name}</span>
        <Badge count={projectCountMap[ws.id] ?? 0} showZero={false}
          style={{ backgroundColor: 'var(--border-color)', color: 'var(--icon-muted)', fontSize: 10, boxShadow: 'none' }}
        />
      </span>
    ),
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

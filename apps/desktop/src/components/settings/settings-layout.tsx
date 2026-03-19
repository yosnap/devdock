/// Settings layout with tab navigation for IDEs, Workspaces, GitHub, Health.
import {
  GithubOutlined,
  HeartOutlined,
  LaptopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Tabs } from 'antd';
import { GithubAuthSettings } from '../github/github-auth-settings';
import { HealthConfigPanel } from '../health/health-config-panel';
import { IdeConfigPanel } from '../settings/ide-config-panel';
import { WorkspaceManager } from '../workspaces/workspace-manager';
import { useAppStore } from '../../stores/app-store';

const TABS = [
  { key: 'ides', label: 'IDEs', icon: <LaptopOutlined />, content: <IdeConfigPanel /> },
  { key: 'workspaces', label: 'Workspaces', icon: <TeamOutlined />, content: <WorkspaceManager /> },
  { key: 'github', label: 'GitHub', icon: <GithubOutlined />, content: <GithubAuthSettings /> },
  { key: 'health', label: 'Health Score', icon: <HeartOutlined />, content: <HealthConfigPanel /> },
];

export function SettingsLayout() {
  const { activeSettingsTab, setActiveSettingsTab } = useAppStore();

  return (
    <div style={{ padding: '16px 24px', maxWidth: 800 }}>
      <Tabs
        activeKey={activeSettingsTab}
        onChange={setActiveSettingsTab}
        items={TABS.map((t) => ({
          key: t.key,
          label: (
            <span>
              {t.icon}
              {t.label}
            </span>
          ),
          children: <div style={{ paddingTop: 16 }}>{t.content}</div>,
        }))}
      />
    </div>
  );
}

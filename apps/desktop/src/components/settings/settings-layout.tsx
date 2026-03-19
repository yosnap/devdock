/// Settings layout with tab navigation for IDEs, Workspaces, GitHub, Health, About.
import {
  GithubOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  LaptopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Tabs } from 'antd';
import { lazy, Suspense } from 'react';
import { useAppStore } from '../../stores/app-store';

// Lazy-load heavy settings panels to keep initial bundle lean
const IdeConfigPanel = lazy(() => import('./ide-config-panel').then(m => ({ default: m.IdeConfigPanel })));
const WorkspaceManager = lazy(() => import('../workspaces/workspace-manager').then(m => ({ default: m.WorkspaceManager })));
const GithubAuthSettings = lazy(() => import('../github/github-auth-settings').then(m => ({ default: m.GithubAuthSettings })));
const HealthConfigPanel = lazy(() => import('../health/health-config-panel').then(m => ({ default: m.HealthConfigPanel })));
const AboutPanel = lazy(() => import('./about-panel').then(m => ({ default: m.AboutPanel })));

const TABS = [
  { key: 'ides',       label: 'IDEs',        icon: <LaptopOutlined />,      Panel: IdeConfigPanel },
  { key: 'workspaces', label: 'Workspaces',   icon: <TeamOutlined />,        Panel: WorkspaceManager },
  { key: 'github',     label: 'GitHub',       icon: <GithubOutlined />,      Panel: GithubAuthSettings },
  { key: 'health',     label: 'Health Score', icon: <HeartOutlined />,       Panel: HealthConfigPanel },
  { key: 'about',      label: 'About',        icon: <InfoCircleOutlined />,  Panel: AboutPanel },
];

export function SettingsLayout() {
  const { activeSettingsTab, setActiveSettingsTab } = useAppStore();

  return (
    <div style={{ padding: '16px 24px', maxWidth: 800 }}>
      <Tabs
        activeKey={activeSettingsTab}
        onChange={setActiveSettingsTab}
        items={TABS.map(({ key, label, icon, Panel }) => ({
          key,
          label: <span>{icon} {label}</span>,
          children: (
            <div style={{ paddingTop: 16 }}>
              <Suspense fallback={null}>
                <Panel />
              </Suspense>
            </div>
          ),
        }))}
      />
    </div>
  );
}

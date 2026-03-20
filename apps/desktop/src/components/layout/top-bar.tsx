import {
  AppstoreOutlined,
  BarsOutlined,
  DesktopOutlined,
  MoonOutlined,
  PlusOutlined,
  SearchOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { Button, Input, Segmented, Tooltip } from 'antd';
import { AdvancedFilters } from '../filters/advanced-filters';
import { useTheme } from '../../hooks/use-theme';
import { useAppStore } from '../../stores/app-store';
import type { AppTheme, ViewMode } from '@devdock/types';

interface TopBarProps {
  onAddProject: () => void;
}

const THEME_CYCLE: AppTheme[] = ['light', 'dark', 'auto'];
const THEME_ICON = { light: <SunOutlined />, dark: <MoonOutlined />, auto: <DesktopOutlined /> };
const THEME_LABEL = { light: 'Tema claro', dark: 'Tema oscuro', auto: 'Tema automático (sistema)' };

export function TopBar({ onAddProject }: TopBarProps) {
  const { viewMode, setViewMode, filters, setFilters } = useAppStore();
  const { theme, applyTheme } = useTheme();

  function cycleTheme() {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    applyTheme(next);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-base)',
      }}
    >
      {/* Search */}
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search projects…"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
        style={{ maxWidth: 280 }}
        allowClear
      />

      {/* Advanced filters popover */}
      <AdvancedFilters />

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <Tooltip title={THEME_LABEL[theme]}>
        <Button
          type="text"
          icon={THEME_ICON[theme]}
          onClick={cycleTheme}
          style={{ fontSize: 16 }}
        />
      </Tooltip>

      {/* View mode toggle */}
      <Segmented<ViewMode>
        options={[
          { value: 'grid', icon: <AppstoreOutlined /> },
          { value: 'list', icon: <BarsOutlined /> },
        ]}
        value={viewMode}
        onChange={setViewMode}
      />

      {/* Add project */}
      <Button type="primary" icon={<PlusOutlined />} onClick={onAddProject}>
        Add Project
      </Button>
    </div>
  );
}

import {
  AppstoreOutlined,
  BarsOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Segmented } from 'antd';
import { AdvancedFilters } from '../filters/advanced-filters';
import { useAppStore } from '../../stores/app-store';
import type { ViewMode } from '../../types';

interface TopBarProps {
  onAddProject: () => void;
}

export function TopBar({ onAddProject }: TopBarProps) {
  const { viewMode, setViewMode, filters, setFilters } = useAppStore();

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

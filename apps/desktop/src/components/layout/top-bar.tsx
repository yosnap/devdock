import {
  AppstoreOutlined,
  BarsOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Select, Space, Segmented } from 'antd';
import { useAppStore } from '../../stores/app-store';
import type { ViewMode } from '../../types';

interface TopBarProps {
  onAddProject: () => void;
}

const STACK_OPTIONS = [
  { value: 'node', label: 'Node.js' },
  { value: 'rust', label: 'Rust' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java/Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'dotnet', label: '.NET' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
];

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

      <Space size={6}>
        {/* Stack filter */}
        <Select
          placeholder="Stack"
          options={STACK_OPTIONS}
          value={filters.stack}
          onChange={(val) => setFilters({ stack: val })}
          allowClear
          style={{ width: 130 }}
        />

        {/* Status filter */}
        <Select
          placeholder="Status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(val) => setFilters({ status: val })}
          allowClear
          style={{ width: 110 }}
        />
      </Space>

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

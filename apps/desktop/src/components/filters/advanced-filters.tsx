import { FilterOutlined, HeartFilled } from '@ant-design/icons';
import { Button, Popover, Select, Switch, Typography } from 'antd';
import { useState } from 'react';
import { useWorkspaces } from '@devdock/hooks';
import { useAppStore } from '../../stores/app-store';

const { Text } = Typography;

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

export function AdvancedFilters() {
  const { filters, setFilters, resetFilters } = useAppStore();
  const { data: workspaces = [] } = useWorkspaces();
  const [open, setOpen] = useState(false);

  const wsOptions = workspaces.map((ws) => ({ value: ws.id, label: ws.name }));

  const activeCount = [
    filters.workspace_id,
    filters.status,
    filters.stack,
    filters.tag,
  ].filter(Boolean).length;

  const filterContent = (
    <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
          WORKSPACE
        </Text>
        <Select
          options={wsOptions}
          value={filters.workspace_id}
          onChange={(val) => setFilters({ workspace_id: val })}
          allowClear
          placeholder="All workspaces"
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
          STACK
        </Text>
        <Select
          options={STACK_OPTIONS}
          value={filters.stack}
          onChange={(val) => setFilters({ stack: val })}
          allowClear
          placeholder="All stacks"
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
          STATUS
        </Text>
        <Select
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(val) => setFilters({ status: val })}
          allowClear
          placeholder="All statuses"
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HeartFilled style={{ color: '#ff4d4f' }} />
        <Text style={{ fontSize: 13 }}>Favorites only</Text>
        <div style={{ flex: 1 }} />
        <Switch
          size="small"
          checked={filters.status === 'active' && filters.tag === 'favorite'}
          onChange={(checked) =>
            setFilters({ tag: checked ? 'favorite' : undefined })
          }
        />
      </div>

      <Button size="small" type="text" onClick={resetFilters} style={{ alignSelf: 'flex-start' }}>
        Clear all filters
      </Button>
    </div>
  );

  return (
    <Popover
      content={filterContent}
      title="Filters"
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Button
        icon={<FilterOutlined />}
        type={activeCount > 0 ? 'primary' : 'default'}
        ghost={activeCount > 0}
      >
        {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
      </Button>
    </Popover>
  );
}

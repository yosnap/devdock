import {
  ExclamationCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Button, Space, Table, Tag, Tooltip, Typography, notification } from 'antd';
import { useCheckOutdated, useDeps, useScanDeps } from '../../queries/use-deps-query';
import type { Dependency } from '../../types';

const { Text } = Typography;

interface ProjectDepsTableProps {
  projectId: string;
}

export function ProjectDepsTable({ projectId }: ProjectDepsTableProps) {
  const { data: deps = [], isLoading } = useDeps(projectId);
  const scanDeps = useScanDeps();
  const checkOutdated = useCheckOutdated();

  async function handleScan() {
    await scanDeps.mutateAsync(projectId);
    notification.success({ message: 'Dependencies scanned' });
  }

  async function handleCheckOutdated() {
    const count = await checkOutdated.mutateAsync(projectId);
    notification.info({ message: `${count} outdated packages found` });
  }

  const columns = [
    {
      title: 'Package',
      dataIndex: 'name',
      render: (name: string, dep: Dependency) => (
        <Space>
          <Text strong>{name}</Text>
          {dep.has_vulnerability && (
            <Tooltip title="Known vulnerability">
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Ecosystem',
      dataIndex: 'ecosystem',
      width: 90,
      render: (eco: string) => {
        const colors: Record<string, string> = {
          npm: 'red', cargo: 'volcano', pip: 'blue', go: 'cyan',
        };
        return <Tag color={colors[eco] ?? 'default'}>{eco}</Tag>;
      },
    },
    {
      title: 'Type',
      dataIndex: 'dep_type',
      width: 140,
      render: (type: string) => (
        <Text type="secondary" style={{ fontSize: 11 }}>{type ?? '—'}</Text>
      ),
    },
    {
      title: 'Current',
      dataIndex: 'current_version',
      width: 100,
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Latest',
      dataIndex: 'latest_version',
      width: 100,
      render: (v: string, dep: Dependency) => (
        <Text
          code
          style={{ fontSize: 11, color: dep.is_outdated ? '#fa8c16' : undefined }}
        >
          {v ?? '—'}
        </Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_: unknown, dep: Dependency) => {
        if (dep.has_vulnerability) return <Tag color="red">Vulnerable</Tag>;
        if (dep.is_outdated) return <Tag color="orange">Outdated</Tag>;
        if (dep.latest_version) return <Tag color="green">Up to date</Tag>;
        return <Tag>Unknown</Tag>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        <Button
          size="small"
          icon={<SyncOutlined />}
          loading={scanDeps.isPending}
          onClick={handleScan}
        >
          Scan Files
        </Button>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          loading={checkOutdated.isPending}
          onClick={handleCheckOutdated}
          disabled={deps.length === 0}
        >
          Check Outdated
        </Button>
      </div>
      <Table
        dataSource={deps}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 15, size: 'small', hideOnSinglePage: true }}
        size="small"
        locale={{ emptyText: 'No dependencies found. Click "Scan Files" to detect.' }}
      />
    </div>
  );
}

/// Compact sync + auth status widget shown in the top bar when the user is authenticated.
/// Displays a coloured dot (synced / syncing / error) and a dropdown with user info,
/// last-sync time, force-sync action, and sign-out.
import {
  CheckCircleFilled,
  CloudOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  LogoutOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { Button, Dropdown, Space, Spin, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useDesktopAuth } from '../../hooks/use-desktop-auth';

const { Text } = Typography;

interface SyncStatus {
  pending_count: number;
  last_error: string | null;
  last_synced_at: string | null;
}

type SyncState = 'synced' | 'syncing' | 'error' | 'offline';

const STATUS_DOT: Record<SyncState, React.ReactNode> = {
  synced: <CheckCircleFilled style={{ color: '#52c41a', fontSize: 10 }} />,
  syncing: <LoadingOutlined style={{ color: '#faad14', fontSize: 10 }} />,
  error: <ExclamationCircleFilled style={{ color: '#ff4d4f', fontSize: 10 }} />,
  offline: <CheckCircleFilled style={{ color: '#8c8c8c', fontSize: 10 }} />,
};

const STATUS_LABEL: Record<SyncState, string> = {
  synced: 'Synced',
  syncing: 'Syncing…',
  error: 'Sync error',
  offline: 'Offline',
};

function deriveSyncState(status: SyncStatus | null): SyncState {
  if (!status) return 'offline';
  if (status.last_error) return 'error';
  if (status.pending_count > 0) return 'syncing';
  return 'synced';
}

function formatLastSync(ts: string | null): string {
  if (!ts) return 'Never';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

interface SyncStatusIndicatorProps {
  onSignInClick?: () => void;
}

export function SyncStatusIndicator({ onSignInClick }: SyncStatusIndicatorProps = {}) {
  const { user, signOut } = useDesktopAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [forceSyncing, setForceSyncing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      // get_sync_status is provided by the P3 sync module on the merged branch;
      // on P6-only branch it may not exist yet — catch and ignore gracefully.
      const status = await invoke<SyncStatus>('get_sync_status');
      setSyncStatus(status);
    } catch {
      // Sync commands not yet available (P3 not merged) — stay offline
      setSyncStatus(null);
    }
  }, []);

  // Poll sync status every 10 s while authenticated
  useEffect(() => {
    if (!user) return;
    fetchStatus();
    const id = setInterval(fetchStatus, 10_000);
    return () => clearInterval(id);
  }, [user, fetchStatus]);

  async function handleForceSync() {
    setForceSyncing(true);
    try {
      await invoke('force_sync');
      await fetchStatus();
    } catch {
      // ignore — P3 not merged yet
    } finally {
      setForceSyncing(false);
    }
  }

  if (!user) {
    return (
      <Button size="small" icon={<CloudOutlined />} onClick={onSignInClick}>
        Sign in to sync
      </Button>
    );
  }

  const syncState = deriveSyncState(syncStatus);

  const menuItems: MenuProps['items'] = [
    {
      key: 'user',
      label: (
        <Space direction="vertical" size={0} style={{ padding: '4px 0' }}>
          <Text strong>{user.email}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {STATUS_LABEL[syncState]} · Last sync: {formatLastSync(syncStatus?.last_synced_at ?? null)}
          </Text>
          {syncStatus?.last_error && (
            <Text type="danger" style={{ fontSize: 11 }}>
              {syncStatus.last_error}
            </Text>
          )}
        </Space>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'force-sync',
      icon: forceSyncing ? <Spin size="small" /> : <SyncOutlined />,
      label: 'Force sync now',
      onClick: handleForceSync,
      disabled: forceSyncing,
    },
    { type: 'divider' },
    {
      key: 'sign-out',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      danger: true,
      onClick: signOut,
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Tooltip title={`${STATUS_LABEL[syncState]} — ${user.email}`}>
        <Button
          type="text"
          size="small"
          style={{ display: 'flex', alignItems: 'center', gap: 6, paddingInline: 8 }}
        >
          <CloudOutlined style={{ fontSize: 15 }} />
          {STATUS_DOT[syncState]}
        </Button>
      </Tooltip>
    </Dropdown>
  );
}

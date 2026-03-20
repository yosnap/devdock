/// CI/Actions status badge — compact colored dot + label.
/// Shows: success (green) | failure (red) | running (yellow spinner) | unknown (gray).
import { CheckCircleFilled, CloseCircleFilled, MinusCircleFilled, SyncOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { CiStatus } from '@devdock/types';

interface ActionsStatusBadgeProps {
  status: CiStatus;
  compact?: boolean;
}

const CONFIG = {
  success: { icon: <CheckCircleFilled style={{ color: '#52c41a' }} />, label: 'CI passing' },
  failure: { icon: <CloseCircleFilled style={{ color: '#ff4d4f' }} />, label: 'CI failing' },
  running: { icon: <SyncOutlined spin style={{ color: '#faad14' }} />, label: 'CI running' },
  unknown: { icon: <MinusCircleFilled style={{ color: 'var(--icon-muted)' }} />, label: 'CI unknown' },
} as const;

export function ActionsStatusBadge({ status, compact = false }: ActionsStatusBadgeProps) {
  const cfg = CONFIG[status.overall] ?? CONFIG.unknown;
  const lastRun = status.runs[0];

  const tooltip = lastRun
    ? `${cfg.label} — ${lastRun.name} (${lastRun.conclusion ?? lastRun.status})`
    : cfg.label;

  if (compact) {
    return (
      <Tooltip title={tooltip}>
        <span style={{ cursor: 'default' }}>{cfg.icon}</span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltip}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'default' }}>
        {cfg.icon}
        <span style={{ fontSize: 12, color: '#666' }}>{cfg.label}</span>
      </span>
    </Tooltip>
  );
}

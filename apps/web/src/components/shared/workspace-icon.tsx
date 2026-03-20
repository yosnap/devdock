/// Renders workspace visual: avatar (URL) → icon (Ant Design) → color dot fallback.
import { Avatar } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import type { Workspace } from '@devdock/types';

interface WorkspaceIconProps {
  workspace: Pick<Workspace, 'avatar' | 'icon' | 'color' | 'name'>;
  size?: number;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  FolderOutlined: <FolderOutlined />,
};

export function WorkspaceIcon({ workspace, size = 24 }: WorkspaceIconProps) {
  const color = workspace.color ?? '#1677ff';

  // Priority 1: avatar URL (from Supabase Storage)
  if (workspace.avatar) {
    return <Avatar size={size} src={workspace.avatar} style={{ flexShrink: 0 }} />;
  }

  // Priority 2: named icon
  const iconNode = workspace.icon ? ICON_MAP[workspace.icon] : null;
  if (iconNode) {
    return (
      <span style={{ fontSize: size * 0.7, color, flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
        {iconNode}
      </span>
    );
  }

  // Priority 3: color dot
  return (
    <span
      style={{
        width: size * 0.5,
        height: size * 0.5,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

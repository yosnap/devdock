/// Renders workspace visual: avatar (image) → icon (Ant Design) → color dot fallback.
import { Avatar } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { useAvatarUrl } from '../../hooks/use-avatar-url';
import type { Workspace } from '@devdock/types';

interface WorkspaceIconProps {
  workspace: Pick<Workspace, 'avatar' | 'icon' | 'color' | 'name'>;
  size?: number;
}

/** Maps icon field strings to Ant Design icon components */
const ICON_MAP: Record<string, React.ReactNode> = {
  FolderOutlined: <FolderOutlined />,
};

export function WorkspaceIcon({ workspace, size = 24 }: WorkspaceIconProps) {
  const avatarUrl = useAvatarUrl(workspace.avatar);
  const color = workspace.color ?? '#1677ff';

  // Priority 1: avatar image
  if (avatarUrl) {
    return <Avatar size={size} src={avatarUrl} style={{ flexShrink: 0 }} />;
  }

  // Priority 2: named icon with workspace color
  const iconNode = workspace.icon ? ICON_MAP[workspace.icon] : null;
  if (iconNode) {
    return (
      <span style={{ fontSize: size * 0.7, color, flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
        {iconNode}
      </span>
    );
  }

  // Priority 3: color dot fallback
  const dotSize = Math.max(size * 0.6, 10);
  return (
    <span
      style={{
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

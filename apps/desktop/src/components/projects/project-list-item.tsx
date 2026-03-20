import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  HeartFilled,
  HeartOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Space, Tag, Tooltip, Typography } from 'antd';
import { useUpdateProject } from '@devdock/hooks';
import { useLaunchProject } from '../../queries/use-desktop-only-queries';
import { useAvatarUrl } from '../../hooks/use-avatar-url';
import type { Project } from '@devdock/types';
import { stackColor, stackLabel } from './stack-utils';

const { Text } = Typography;

interface ProjectListItemProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectListItem({ project, onEdit, onDelete }: ProjectListItemProps) {
  const launch = useLaunchProject();
  const update = useUpdateProject();
  const avatarUrl = useAvatarUrl(project.avatar);

  function toggleFavorite() {
    update.mutate({ id: project.id, is_favorite: !project.is_favorite });
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-base)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-base)')}
    >
      {/* Favorite */}
      <Tooltip title={project.is_favorite ? 'Remove favorite' : 'Add favorite'}>
        {project.is_favorite
          ? <HeartFilled onClick={toggleFavorite} style={{ color: '#ff4d4f', cursor: 'pointer' }} />
          : <HeartOutlined onClick={toggleFavorite} style={{ color: 'var(--icon-muted)', cursor: 'pointer' }} />
        }
      </Tooltip>

      {/* Icon + Name */}
      {avatarUrl ? (
        <Avatar size={28} src={avatarUrl} />
      ) : (
        <FolderOpenOutlined style={{ color: '#1677ff', fontSize: 16 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 13 }}>{project.name}</Text>
          {project.stack && (
            <Tag color={stackColor(project.stack)} style={{ margin: 0, fontSize: 11 }}>
              {stackLabel(project.stack)}
            </Tag>
          )}
          {project.status !== 'active' && (
            <Tag color={project.status === 'paused' ? 'orange' : 'red'} style={{ margin: 0, fontSize: 11 }}>
              {project.status}
            </Tag>
          )}
          {project.tags?.map((tag) => (
            <Tag key={tag} style={{ margin: 0, fontSize: 11 }}>{tag}</Tag>
          ))}
        </div>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {project.path.length > 60 ? '…' + project.path.slice(-57) : project.path}
        </Text>
      </div>

      {/* Actions */}
      <Space size={4}>
        <Tooltip title="Open in IDE">
          <Button
            type="text"
            size="small"
            icon={<RocketOutlined />}
            loading={launch.isPending}
            onClick={() => launch.mutate(project.id)}
          />
        </Tooltip>
        <Tooltip title="Edit">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(project)} />
        </Tooltip>
        <Tooltip title="Delete">
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(project)}
          />
        </Tooltip>
      </Space>
    </div>
  );
}

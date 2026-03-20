import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  HeartFilled,
  HeartOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Card, Space, Tag, Tooltip, Typography } from 'antd';
import { useUpdateProject, useWorkspaces } from '@devdock/hooks';
import { useLaunchProject } from '../../queries/use-desktop-only-queries';
import { useAvatarUrl } from '../../hooks/use-avatar-url';
import type { Project } from '@devdock/types';
import { HealthScoreBadge } from '../health/health-score-badge';
import { TechStackBadges } from './tech-stack-badges';
import { stackColor, stackLabel } from './stack-utils';

const { Text, Paragraph } = Typography;

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onOpenDetail?: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete, onOpenDetail }: ProjectCardProps) {
  const launch = useLaunchProject();
  const update = useUpdateProject();
  const avatarUrl = useAvatarUrl(project.avatar);
  const { data: workspaces = [] } = useWorkspaces();

  const wsColor = project.workspace_id
    ? workspaces.find((w) => w.id === project.workspace_id)?.color ?? '#1677ff'
    : '#1677ff';

  // tech_breakdown may be a JSON string (from Rust) or object (from Supabase)
  const techBreakdown = typeof project.tech_breakdown === 'string'
    ? (() => { try { return JSON.parse(project.tech_breakdown); } catch { return null; } })()
    : project.tech_breakdown ?? null;

  function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    update.mutate({ id: project.id, is_favorite: !project.is_favorite });
  }

  function handleLaunch(e: React.MouseEvent) {
    e.stopPropagation();
    launch.mutate(project.id);
  }

  const actions = [
    <Tooltip key="launch" title="Open in IDE">
      <RocketOutlined onClick={handleLaunch} />
    </Tooltip>,
    <Tooltip key="edit" title="Edit">
      <EditOutlined onClick={(e) => { e.stopPropagation(); onEdit(project); }} />
    </Tooltip>,
    <Tooltip key="delete" title="Delete">
      <DeleteOutlined
        onClick={(e) => { e.stopPropagation(); onDelete(project); }}
        style={{ color: '#ff4d4f' }}
      />
    </Tooltip>,
  ];

  return (
    <Badge.Ribbon
      text={project.status !== 'active' ? project.status : null}
      color={project.status === 'paused' ? 'orange' : 'red'}
      style={{ display: project.status === 'active' ? 'none' : undefined }}
    >
      <Card
        hoverable
        size="small"
        actions={actions}
        style={{ height: '100%' }}
        styles={{ body: { padding: '12px 16px' } }}
        onClick={() => onOpenDetail?.(project)}
      >
        {/* Row 1: Avatar + Name + Health + Favorite */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {avatarUrl ? (
              <Avatar size={28} src={avatarUrl} style={{ flexShrink: 0 }} />
            ) : (
              <FolderOpenOutlined style={{ fontSize: 18, color: '#1677ff', flexShrink: 0 }} />
            )}
            <Text strong ellipsis style={{ fontSize: 14 }}>
              {project.name}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <HealthScoreBadge score={project.health_score} size="small" />
            <Tooltip title={project.is_favorite ? 'Remove favorite' : 'Add favorite'}>
              {project.is_favorite
                ? <HeartFilled onClick={toggleFavorite} style={{ color: '#ff4d4f', cursor: 'pointer' }} />
                : <HeartOutlined onClick={toggleFavorite} style={{ cursor: 'pointer', color: 'var(--icon-muted)' }} />
              }
            </Tooltip>
          </div>
        </div>

        {/* Row 2: App version with workspace color */}
        {techBreakdown?.version && (
          <span style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 500,
            color: wsColor,
            backgroundColor: `${wsColor}15`,
            borderRadius: 4,
            padding: '1px 8px',
            marginBottom: 4,
          }}>
            v{techBreakdown.version}
          </span>
        )}

        {/* Row 3: Description */}
        {project.description && (
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 2 }}
            style={{ fontSize: 12, marginBottom: 6, minHeight: 32 }}
          >
            {project.description}
          </Paragraph>
        )}

        {/* Row 4: Tech logos + versions */}
        {techBreakdown && (
          <div style={{ marginBottom: 6 }}>
            <TechStackBadges breakdown={techBreakdown} />
          </div>
        )}

        {/* Row 5: Tags */}
        <div>
          <Space size={4} wrap>
            {!techBreakdown && project.stack && (
              <Tag color={stackColor(project.stack)} style={{ margin: 0 }}>
                {stackLabel(project.stack)}
              </Tag>
            )}
            {project.tags?.map((tag) => (
              <Tag key={tag} style={{ margin: 0 }}>{tag}</Tag>
            ))}
          </Space>
        </div>

      </Card>
    </Badge.Ribbon>
  );
}

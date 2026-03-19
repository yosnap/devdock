import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  HeartFilled,
  HeartOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { Badge, Card, Space, Tag, Tooltip, Typography } from 'antd';
import { useLaunchProject, useUpdateProject } from '../../queries/use-projects-query';
import type { Project } from '../../types';
import { HealthScoreBadge } from '../health/health-score-badge';
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <FolderOpenOutlined style={{ fontSize: 18, color: '#1677ff', flexShrink: 0 }} />
            <Text strong ellipsis style={{ fontSize: 14 }}>
              {project.name}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <HealthScoreBadge score={project.health_score} size="small" />
            <Tooltip title={project.is_favorite ? 'Remove favorite' : 'Add favorite'}>
              {project.is_favorite
                ? <HeartFilled onClick={toggleFavorite} style={{ color: '#ff4d4f', cursor: 'pointer' }} />
                : <HeartOutlined onClick={toggleFavorite} style={{ cursor: 'pointer', color: '#bbb' }} />
              }
            </Tooltip>
          </div>
        </div>

        {project.description && (
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 2 }}
            style={{ fontSize: 12, marginBottom: 8, minHeight: 32 }}
          >
            {project.description}
          </Paragraph>
        )}

        <div style={{ marginTop: 8 }}>
          <Space size={4} wrap>
            {project.stack && (
              <Tag color={stackColor(project.stack)} style={{ margin: 0 }}>
                {stackLabel(project.stack)}
              </Tag>
            )}
            {project.tags?.map((tag) => (
              <Tag key={tag} style={{ margin: 0 }}>{tag}</Tag>
            ))}
          </Space>
        </div>

        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
          {project.path.length > 40 ? '…' + project.path.slice(-37) : project.path}
        </Text>
      </Card>
    </Badge.Ribbon>
  );
}

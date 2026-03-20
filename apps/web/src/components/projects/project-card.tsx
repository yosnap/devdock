/// Web project card — same layout as desktop but without IDE launch or path.
import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  HeartFilled,
  HeartOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Card, Space, Tag, Tooltip, Typography } from 'antd';
import { useUpdateProject } from '@devdock/hooks';
import type { Project } from '@devdock/types';
import { HealthScoreBadge } from '../shared/health-score-badge';
import { TechStackBadges } from '../shared/tech-stack-badges';
import { stackColor, stackLabel } from '../shared/stack-utils';
import { useNavigate } from 'react-router-dom';

const { Text, Paragraph } = Typography;

interface ProjectCardProps {
  project: Project;
  workspaceColor?: string;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, workspaceColor, onEdit, onDelete }: ProjectCardProps) {
  const update = useUpdateProject();
  const navigate = useNavigate();

  function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    update.mutate({ id: project.id, is_favorite: !project.is_favorite });
  }

  const actions = [
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
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        {/* Row 1: Avatar + Name + Health + Favorite */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {workspaceColor && (
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: workspaceColor, flexShrink: 0,
              }} />
            )}
            {project.avatar ? (
              <Avatar size={24} src={project.avatar} style={{ flexShrink: 0 }} />
            ) : (
              <FolderOpenOutlined style={{ fontSize: 16, color: '#1677ff', flexShrink: 0 }} />
            )}
            <Text strong ellipsis style={{ fontSize: 14 }}>{project.name}</Text>
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

        {/* Row 2: App version */}
        {project.tech_breakdown?.version && (
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4, paddingLeft: 34 }}>
            v{project.tech_breakdown.version}
          </Text>
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
        {project.tech_breakdown && (
          <div style={{ marginBottom: 6 }}>
            <TechStackBadges breakdown={project.tech_breakdown} />
          </div>
        )}

        {/* Row 5: Tags */}
        <div>
          <Space size={4} wrap>
            {!project.tech_breakdown && project.stack && (
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

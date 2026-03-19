import {
  BranchesOutlined,
  CodeOutlined,
  EditOutlined,
  FolderOutlined,
  LinkOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Descriptions, Divider, Drawer, Space, Tag, Tabs, Tooltip, Typography } from 'antd';
import { useState, useEffect } from 'react';
import { ProjectLinksList } from '../links/project-links-list';
import { NotesPanel } from '../notes/notes-panel';
import { ProjectDepsTable } from './project-deps-table';
import { ProjectTechBreakdown } from './project-tech-breakdown';
import { ProjectGitBadge } from './project-git-badge';
import { AvatarPicker } from './avatar-picker';
import { stackColor, stackLabel } from './stack-utils';
import { useQueryClient } from '@tanstack/react-query';
import { useLaunchProject, PROJECT_KEYS } from '../../queries/use-projects-query';
import { useAvatarUrl } from '../../hooks/use-avatar-url';
import type { Project } from '../../types';

const { Text, Title } = Typography;

interface ProjectDetailDrawerProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onEdit: (project: Project) => void;
}

export function ProjectDetailDrawer({
  project,
  open,
  onClose,
  onEdit,
}: ProjectDetailDrawerProps) {
  const launch = useLaunchProject();
  const qc = useQueryClient();
  // Track local avatar override after upload (undefined = use project.avatar)
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);

  // Reset override when switching projects
  useEffect(() => {
    setAvatarOverride(undefined);
  }, [project?.id]);

  const currentAvatar = avatarOverride === undefined
    ? project?.avatar
    : (avatarOverride ?? undefined);
  const avatarUrl = useAvatarUrl(currentAvatar);

  if (!project) return null;

  const tabItems = [
    {
      key: 'info',
      label: <span><FolderOutlined /> Info</span>,
      children: (
        <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Path">
              <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {project.path}
              </Text>
            </Descriptions.Item>
            {project.description && (
              <Descriptions.Item label="Description">
                {project.description}
              </Descriptions.Item>
            )}
            {project.stack && (
              <Descriptions.Item label="Stack">
                <Tag color={stackColor(project.stack)}>{stackLabel(project.stack)}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Status">
              <Tag color={project.status === 'active' ? 'green' : project.status === 'paused' ? 'orange' : 'red'}>
                {project.status}
              </Tag>
            </Descriptions.Item>
            {project.tags && project.tags.length > 0 && (
              <Descriptions.Item label="Tags">
                <Space size={4} wrap>
                  {project.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                </Space>
              </Descriptions.Item>
            )}
            {project.last_opened_at && (
              <Descriptions.Item label="Last Opened">
                {project.last_opened_at.slice(0, 10)}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Created">
              {project.created_at.slice(0, 10)}
            </Descriptions.Item>
          </Descriptions>
          <Divider style={{ marginTop: 16 }}>Imagen</Divider>
          <AvatarPicker
            entity="project"
            entityId={project.id}
            currentAvatar={currentAvatar}
            entityName={project.name}
            size={56}
            onAvatarChange={async (f) => {
              setAvatarOverride(f);
              await qc.invalidateQueries({ queryKey: PROJECT_KEYS.all });
            }}
          />
          <Divider style={{ marginTop: 16 }}>Tech Stack</Divider>
          <ProjectTechBreakdown path={project.path} />
        </>
      ),
    },
    {
      key: 'git',
      label: <span><BranchesOutlined /> Git</span>,
      children: (
        <div style={{ padding: '4px 0' }}>
          <ProjectGitBadge projectId={project.id} />
        </div>
      ),
    },
    {
      key: 'deps',
      label: <span><CodeOutlined /> Dependencies</span>,
      children: <ProjectDepsTable projectId={project.id} />,
    },
    {
      key: 'notes',
      label: <span><EditOutlined /> Notas</span>,
      children: (
        <div style={{ paddingTop: 8 }}>
          <NotesPanel
            projectId={project.id}
            githubOwner={project.github_owner}
            githubRepo={project.github_repo}
          />
        </div>
      ),
    },
    {
      key: 'links',
      label: <span><LinkOutlined /> Links</span>,
      children: <ProjectLinksList projectId={project.id} />,
    },
  ];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={36} src={avatarUrl}>
            {!avatarUrl && project.name.substring(0, 2).toUpperCase()}
          </Avatar>
          <Title level={5} style={{ margin: 0 }}>{project.name}</Title>
          {project.stack && (
            <Tag color={stackColor(project.stack)}>{stackLabel(project.stack)}</Tag>
          )}
        </div>
      }
      open={open}
      onClose={onClose}
      width={600}
      extra={
        <Space>
          <Tooltip title="Edit project">
            <Button icon={<EditOutlined />} onClick={() => onEdit(project)} />
          </Tooltip>
          <Button
            type="primary"
            icon={<RocketOutlined />}
            loading={launch.isPending}
            onClick={() => launch.mutate(project.id)}
          >
            Launch
          </Button>
        </Space>
      }
      styles={{ body: { padding: '12px 24px' } }}
    >
      <Tabs items={tabItems} defaultActiveKey="info" />
    </Drawer>
  );
}

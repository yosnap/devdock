import {
  BranchesOutlined,
  CloudUploadOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Badge, Space, Spin, Tag, Tooltip } from 'antd';
import { useGitStatus } from '../../queries/use-git-query';

interface ProjectGitBadgeProps {
  projectId: string;
  /** Compact mode for project cards */
  compact?: boolean;
}

export function ProjectGitBadge({ projectId, compact = false }: ProjectGitBadgeProps) {
  const { data: git, isLoading } = useGitStatus(projectId);

  if (isLoading) return <Spin size="small" />;
  if (!git || !git.is_git_repo) return null;

  const hasChanges = git.uncommitted_count > 0;
  const hasAhead = git.ahead > 0;
  const hasBehind = git.behind > 0;

  if (compact) {
    return (
      <Tooltip
        title={
          <div>
            <div>Branch: {git.branch}</div>
            {hasChanges && <div>{git.uncommitted_count} uncommitted</div>}
            {hasAhead && <div>↑ {git.ahead} ahead</div>}
            {hasBehind && <div>↓ {git.behind} behind</div>}
          </div>
        }
      >
        <Space size={4}>
          <Tag icon={<BranchesOutlined />} style={{ margin: 0, fontSize: 11 }}>
            {git.branch ?? 'HEAD'}
          </Tag>
          {hasChanges && (
            <Badge count={git.uncommitted_count} size="small" color="orange" />
          )}
        </Space>
      </Tooltip>
    );
  }

  return (
    <Space size={6} wrap>
      <Tag icon={<BranchesOutlined />} color="blue">
        {git.branch ?? 'HEAD'}
      </Tag>
      {hasChanges && (
        <Tooltip title={`${git.uncommitted_count} uncommitted changes`}>
          <Tag icon={<EditOutlined />} color="orange">
            {git.uncommitted_count} changes
          </Tag>
        </Tooltip>
      )}
      {hasAhead && (
        <Tooltip title={`${git.ahead} commits ahead of remote`}>
          <Tag icon={<CloudUploadOutlined />} color="green">
            ↑ {git.ahead}
          </Tag>
        </Tooltip>
      )}
      {hasBehind && (
        <Tooltip title={`${git.behind} commits behind remote`}>
          <Tag icon={<ReloadOutlined />} color="red">
            ↓ {git.behind}
          </Tag>
        </Tooltip>
      )}
      {git.last_commit_msg && (
        <Tooltip title={`${git.last_commit_author} · ${git.last_commit_date?.slice(0, 10)}`}>
          <Tag style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {git.last_commit_msg}
          </Tag>
        </Tooltip>
      )}
    </Space>
  );
}

/// GitHub issues panel — lists open issues + button to create new ones.
/// Requires project to have github_owner/github_repo set.
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { Button, Empty, Space, Spin, Tag, Typography, notification } from 'antd';
import { useState } from 'react';
import { useCreateIssue, useIssues } from '../../queries/use-github-query';
import type { GitHubIssue, Project } from '../../types';
import { CreateIssueModal } from './create-issue-modal';

const { Text, Link } = Typography;

interface IssuesPanelProps {
  project: Project & { github_owner?: string; github_repo?: string };
}

function IssueRow({ issue }: { issue: GitHubIssue }) {
  async function handleOpen() {
    try { await openUrl(issue.html_url); }
    catch (e) { notification.error({ message: String(e) }); }
  }

  return (
    <div
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, marginTop: 2 }}>
        #{issue.number}
      </Text>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link onClick={handleOpen} style={{ fontSize: 13, cursor: 'pointer' }} ellipsis>
          {issue.title}
        </Link>
        <div style={{ marginTop: 4 }}>
          <Space size={4} wrap>
            {issue.labels.map((label) => (
              <Tag key={label} style={{ margin: 0, fontSize: 11 }}>{label}</Tag>
            ))}
            <Text type="secondary" style={{ fontSize: 11 }}>
              by {issue.user_login}
            </Text>
          </Space>
        </div>
      </div>
    </div>
  );
}

export function IssuesPanel({ project }: IssuesPanelProps) {
  const owner = project.github_owner;
  const repo = project.github_repo;

  const { data: issues = [], isLoading, refetch, isFetching } = useIssues(project.id, owner, repo);
  const createIssue = useCreateIssue(project.id);
  const [modalOpen, setModalOpen] = useState(false);

  if (!owner || !repo) {
    return (
      <Empty
        description="No GitHub repository linked. Set the remote URL in project settings."
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong>Open Issues ({issues.length})</Text>
        <Space>
          <Button size="small" icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Issue
          </Button>
        </Space>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : issues.length === 0 ? (
        <Empty description="No open issues" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
          {issues.map((issue) => <IssueRow key={issue.number} issue={issue} />)}
        </div>
      )}

      <CreateIssueModal
        open={modalOpen}
        owner={owner}
        repo={repo}
        onCreate={async (title, body, labels) => {
          await createIssue.mutateAsync({ owner, repo, title, body, labels });
          setModalOpen(false);
          notification.success({ message: 'Issue created' });
        }}
        onClose={() => setModalOpen(false)}
        loading={createIssue.isPending}
      />
    </div>
  );
}

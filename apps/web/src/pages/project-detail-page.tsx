/// Project detail page — tabs: Overview, Notes, Links.
/// No git status, deps, CI tabs (desktop-only scope).
import {
  DeleteOutlined,
  EditOutlined,
  GithubOutlined,
  LinkOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button, Col, Descriptions, Empty, Row, Skeleton,
  Space, Tag, Tabs, Typography, notification, Popconfirm,
} from 'antd';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useProjects, useWorkspaces,
  useNoteItems, useCreateNoteItem, useUpdateNoteItem, useDeleteNoteItem, useToggleNoteResolved,
  useLinks, useUpsertLink, useDeleteLink,
} from '@devdock/hooks';
import type { NoteItem, ProjectLink } from '@devdock/types';
import { HealthScoreBadge } from '../components/shared/health-score-badge';
import { stackColor, stackLabel } from '../components/shared/stack-utils';
import { NoteItemCard } from '../components/notes/note-item-card';
import { NoteItemForm, type NoteFormValues } from '../components/notes/note-item-form';
import { LinkFormModal, type LinkFormValues } from '../components/links/link-form-modal';

const { Title, Text } = Typography;
const CONTENT_MAX_WIDTH = 1200;

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const { data: workspaces = [] } = useWorkspaces();

  const project = projects.find((p) => p.id === id);
  const workspace = workspaces.find((ws) => ws.id === project?.workspace_id);

  // Notes state
  const { data: notes = [], isLoading: notesLoading } = useNoteItems(id ?? '', Boolean(id));
  const createNote = useCreateNoteItem();
  const updateNote = useUpdateNoteItem();
  const deleteNote = useDeleteNoteItem();
  const toggleResolved = useToggleNoteResolved();
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  // Links state
  const { data: links = [], isLoading: linksLoading } = useLinks(id ?? '', Boolean(id));
  const upsertLink = useUpsertLink();
  const deleteLink = useDeleteLink();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ProjectLink | null>(null);

  async function handleNoteSubmit(values: NoteFormValues) {
    if (!id) return;
    try {
      if (editingNote) {
        await updateNote.mutateAsync({ id: editingNote.id, ...values });
        notification.success({ message: 'Note updated' });
      } else {
        await createNote.mutateAsync({ project_id: id, ...values });
        notification.success({ message: 'Note created' });
      }
      setNoteModalOpen(false);
      setEditingNote(null);
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  async function handleLinkSubmit(values: LinkFormValues) {
    if (!id) return;
    try {
      await upsertLink.mutateAsync({
        project_id: id,
        id: editingLink?.id,
        ...values,
      });
      notification.success({ message: editingLink ? 'Link updated' : 'Link added' });
      setLinkModalOpen(false);
      setEditingLink(null);
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', padding: 24 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', padding: 24 }}>
        <Empty description="Project not found">
          <Button onClick={() => navigate('/')}>Back to Projects</Button>
        </Empty>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <div style={{ paddingTop: 16 }}>
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Status">
              <Tag color={project.status === 'active' ? 'green' : project.status === 'paused' ? 'orange' : 'red'}>
                {project.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Health">
              <HealthScoreBadge score={project.health_score} size="medium" />
            </Descriptions.Item>
            {workspace && (
              <Descriptions.Item label="Workspace">
                <Space>
                  {workspace.color && (
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: workspace.color, display: 'inline-block' }} />
                  )}
                  {workspace.name}
                </Space>
              </Descriptions.Item>
            )}
            {project.stack && (
              <Descriptions.Item label="Stack">
                <Tag color={stackColor(project.stack)}>{stackLabel(project.stack)}</Tag>
              </Descriptions.Item>
            )}
            {project.github_owner && project.github_repo && (
              <Descriptions.Item label="GitHub" span={2}>
                <a
                  href={`https://github.com/${project.github_owner}/${project.github_repo}`}
                  target="_blank" rel="noreferrer"
                >
                  <GithubOutlined /> {project.github_owner}/{project.github_repo}
                </a>
              </Descriptions.Item>
            )}
            {project.description && (
              <Descriptions.Item label="Description" span={2}>
                {project.description}
              </Descriptions.Item>
            )}
            {project.tags && project.tags.length > 0 && (
              <Descriptions.Item label="Tags" span={2}>
                <Space wrap>{project.tags.map((t) => <Tag key={t}>{t}</Tag>)}</Space>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Created">
              {new Date(project.created_at).toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">
              {new Date(project.updated_at).toLocaleDateString()}
            </Descriptions.Item>
          </Descriptions>
        </div>
      ),
    },
    {
      key: 'notes',
      label: `Notes${notes.length ? ` (${notes.length})` : ''}`,
      children: (
        <div style={{ paddingTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditingNote(null); setNoteModalOpen(true); }}
            >
              Add Note
            </Button>
          </div>
          {notesLoading ? <Skeleton active /> : notes.length === 0 ? (
            <Empty description="No notes yet" />
          ) : (
            <Row gutter={[16, 0]}>
              {notes.map((note) => (
                <Col key={note.id} xs={24} md={12}>
                  <NoteItemCard
                    note={note}
                    onEdit={(n) => { setEditingNote(n); setNoteModalOpen(true); }}
                    onDelete={(noteId, projectId) => deleteNote.mutate({ id: noteId, projectId })}
                    onToggleResolved={(noteId) => toggleResolved.mutate(noteId)}
                  />
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'links',
      label: `Links${links.length ? ` (${links.length})` : ''}`,
      children: (
        <div style={{ paddingTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditingLink(null); setLinkModalOpen(true); }}
            >
              Add Link
            </Button>
          </div>
          {linksLoading ? <Skeleton active /> : links.length === 0 ? (
            <Empty description="No links yet" />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {links.map((link) => (
                <div
                  key={link.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 6,
                  }}
                >
                  <LinkOutlined style={{ color: '#1677ff' }} />
                  <a href={link.url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                    {link.title || link.url}
                  </a>
                  <Button
                    type="text" size="small" icon={<EditOutlined />}
                    onClick={() => { setEditingLink(link); setLinkModalOpen(true); }}
                  />
                  <Popconfirm
                    title="Delete this link?"
                    onConfirm={() => deleteLink.mutate({ id: link.id, projectId: id! })}
                    okText="Yes" cancelText="No"
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              ))}
            </Space>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', padding: 24 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button type="text" onClick={() => navigate(-1)}>← Back</Button>
        <Title level={3} style={{ margin: 0, flex: 1 }}>{project.name}</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Updated {new Date(project.updated_at).toLocaleDateString()}
        </Text>
      </div>

      <Tabs items={tabItems} defaultActiveKey="overview" />

      <NoteItemForm
        open={noteModalOpen}
        editingNote={editingNote}
        loading={createNote.isPending || updateNote.isPending}
        onSubmit={handleNoteSubmit}
        onCancel={() => { setNoteModalOpen(false); setEditingNote(null); }}
      />

      <LinkFormModal
        open={linkModalOpen}
        editingLink={editingLink}
        loading={upsertLink.isPending}
        onSubmit={handleLinkSubmit}
        onCancel={() => { setLinkModalOpen(false); setEditingLink(null); }}
      />
    </div>
  );
}

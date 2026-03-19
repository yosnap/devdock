/// Single note card with type badge, resolve toggle, GitHub issue link, and actions.
import {
  BugOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CheckCircleTwoTone,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  GithubOutlined,
  LinkOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { Badge, Button, Card, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import type { NoteItem, NoteType } from '../../types';

const { Text, Paragraph } = Typography;

const NOTE_TYPE_META: Record<NoteType, { label: string; color: string; icon: React.ReactNode }> = {
  bug:      { label: 'Bug',       color: 'red',    icon: <BugOutlined /> },
  idea:     { label: 'Idea',      color: 'purple', icon: <BulbOutlined /> },
  task:     { label: 'Tarea',     color: 'blue',   icon: <CheckCircleOutlined /> },
  reminder: { label: 'Reminder',  color: 'orange', icon: <ClockCircleOutlined /> },
  note:     { label: 'Nota',      color: 'default',icon: <PlusCircleOutlined /> },
};

interface NoteCardProps {
  note: NoteItem;
  onEdit: (note: NoteItem) => void;
  onDelete: (id: string) => void;
  onToggleResolved: (id: string) => void;
  onCreateIssue: (note: NoteItem) => void;
}

export function NoteCard({ note, onEdit, onDelete, onToggleResolved, onCreateIssue }: NoteCardProps) {
  const meta = NOTE_TYPE_META[note.note_type as NoteType] ?? NOTE_TYPE_META.note;

  return (
    <Badge.Ribbon
      text={meta.label}
      color={meta.color === 'default' ? 'cyan' : meta.color}
    >
      <Card
        size="small"
        style={{
          marginBottom: 12,
          opacity: note.is_resolved ? 0.6 : 1,
          borderLeft: `3px solid ${note.is_resolved ? '#52c41a' : 'transparent'}`,
        }}
        actions={[
          <Tooltip title={note.is_resolved ? 'Marcar pendiente' : 'Marcar resuelto'} key="resolve">
            <Button
              type="text"
              size="small"
              icon={
                note.is_resolved
                  ? <CheckCircleTwoTone twoToneColor="#52c41a" />
                  : <CheckCircleOutlined />
              }
              onClick={() => onToggleResolved(note.id)}
            />
          </Tooltip>,
          <Tooltip title="Editar" key="edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(note)}
            />
          </Tooltip>,
          <Tooltip
            title={note.github_issue_url ? 'Ver en GitHub' : 'Crear issue en GitHub'}
            key="github"
          >
            <Button
              type="text"
              size="small"
              icon={note.github_issue_url ? <LinkOutlined /> : <GithubOutlined />}
              onClick={() => {
                if (note.github_issue_url) {
                  window.open(note.github_issue_url, '_blank');
                } else {
                  onCreateIssue(note);
                }
              }}
            />
          </Tooltip>,
          <Popconfirm
            key="delete"
            title="¿Eliminar esta nota?"
            onConfirm={() => onDelete(note.id)}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>,
        ]}
      >
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space>
            {meta.icon}
            <Text strong style={{ textDecoration: note.is_resolved ? 'line-through' : 'none' }}>
              {note.title}
            </Text>
            {note.github_issue_number && (
              <Tag color="geekblue" icon={<GithubOutlined />}>
                #{note.github_issue_number}
              </Tag>
            )}
          </Space>
          {note.content && (
            <Paragraph
              type="secondary"
              style={{ margin: 0, fontSize: 12 }}
              ellipsis={{ rows: 2, expandable: true }}
            >
              {note.content}
            </Paragraph>
          )}
        </Space>
      </Card>
    </Badge.Ribbon>
  );
}

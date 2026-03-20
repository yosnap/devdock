/// Single note card with type badge, resolve toggle, edit and delete actions.
/// Web version — no GitHub issue creation (desktop-only).
import {
  BugOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CheckCircleTwoTone,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { Badge, Button, Card, Popconfirm, Space, Tooltip, Typography } from 'antd';
import type { NoteItem, NoteType } from '@devdock/types';

const { Text, Paragraph } = Typography;

const NOTE_TYPE_META: Record<NoteType, { label: string; color: string; icon: React.ReactNode }> = {
  bug:      { label: 'Bug',      color: 'red',     icon: <BugOutlined /> },
  idea:     { label: 'Idea',     color: 'purple',  icon: <BulbOutlined /> },
  task:     { label: 'Task',     color: 'blue',    icon: <CheckCircleOutlined /> },
  reminder: { label: 'Reminder', color: 'orange',  icon: <ClockCircleOutlined /> },
  note:     { label: 'Note',     color: 'default', icon: <PlusCircleOutlined /> },
};

interface NoteItemCardProps {
  note: NoteItem;
  onEdit: (note: NoteItem) => void;
  onDelete: (id: string, projectId: string) => void;
  onToggleResolved: (id: string) => void;
}

export function NoteItemCard({ note, onEdit, onDelete, onToggleResolved }: NoteItemCardProps) {
  const meta = NOTE_TYPE_META[note.note_type as NoteType] ?? NOTE_TYPE_META.note;

  return (
    <Badge.Ribbon text={meta.label} color={meta.color === 'default' ? 'cyan' : meta.color}>
      <Card
        size="small"
        style={{
          marginBottom: 12,
          opacity: note.is_resolved ? 0.6 : 1,
          borderLeft: `3px solid ${note.is_resolved ? '#52c41a' : 'transparent'}`,
        }}
        actions={[
          <Tooltip title={note.is_resolved ? 'Mark pending' : 'Mark resolved'} key="resolve">
            <Button
              type="text" size="small"
              icon={note.is_resolved
                ? <CheckCircleTwoTone twoToneColor="#52c41a" />
                : <CheckCircleOutlined />}
              onClick={() => onToggleResolved(note.id)}
            />
          </Tooltip>,
          <Tooltip title="Edit" key="edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(note)} />
          </Tooltip>,
          <Popconfirm
            key="delete"
            title="Delete this note?"
            onConfirm={() => onDelete(note.id, note.project_id)}
            okText="Yes" cancelText="No"
          >
            <Tooltip title="Delete">
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

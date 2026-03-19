/// Structured notes panel for a project: list, create, edit, resolve, delete, GitHub issue link.
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Empty, Select, Space, Spin, Typography } from 'antd';
import { useState } from 'react';
import {
  createNoteItem,
  createIssue,
  deleteNoteItem,
  linkNoteToIssue,
  listNoteItems,
  toggleNoteResolved,
  updateNoteItem,
} from '../../services/tauri-commands';
import type { CreateNotePayload, NoteItem, NoteType } from '../../types';
import { CreateIssueModal } from '../github/create-issue-modal';
import { CreateNoteModal } from './create-note-modal';
import { NoteCard } from './note-card';

const { Title } = Typography;

type FilterType = 'all' | NoteType | 'resolved' | 'open';

const FILTER_OPTIONS = [
  { value: 'all',      label: 'Todas' },
  { value: 'open',     label: 'Pendientes' },
  { value: 'resolved', label: 'Resueltas' },
  { value: 'bug',      label: '🐛 Bugs' },
  { value: 'idea',     label: '💡 Ideas' },
  { value: 'task',     label: '✅ Tareas' },
  { value: 'reminder', label: '⏰ Recordatorios' },
  { value: 'note',     label: '📝 Notas' },
];

interface NotesPanelProps {
  projectId: string;
  githubOwner?: string;
  githubRepo?: string;
}

export function NotesPanel({ projectId, githubOwner, githubRepo }: NotesPanelProps) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [issueNote, setIssueNote] = useState<NoteItem | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['note_items', projectId],
    queryFn: () => listNoteItems(projectId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['note_items', projectId] });

  const createMut = useMutation({
    mutationFn: (payload: CreateNotePayload) => createNoteItem(payload),
    onSuccess: () => { invalidate(); message.success('Nota creada'); },
    onError: (e: unknown) => message.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: updateNoteItem,
    onSuccess: () => { invalidate(); message.success('Nota actualizada'); },
    onError: (e: unknown) => message.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteNoteItem,
    onSuccess: () => { invalidate(); message.success('Nota eliminada'); },
    onError: (e: unknown) => message.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: toggleNoteResolved,
    onSuccess: () => invalidate(),
    onError: (e: unknown) => message.error(String(e)),
  });

  const handleSubmit = async (values: { title: string; content: string; note_type: NoteType }) => {
    if (editingNote) {
      await updateMut.mutateAsync({ id: editingNote.id, ...values });
    } else {
      await createMut.mutateAsync({ project_id: projectId, ...values });
    }
    setModalOpen(false);
    setEditingNote(null);
  };

  const handleEdit = (note: NoteItem) => {
    setEditingNote(note);
    setModalOpen(true);
  };

  const handleCreateIssue = async (title: string, body: string, labels: string[]) => {
    if (!issueNote || !githubOwner || !githubRepo) return;
    setIssueLoading(true);
    try {
      const issue = await createIssue(githubOwner, githubRepo, title, body, labels);
      await linkNoteToIssue(issueNote.id, issue.html_url, issue.number);
      invalidate();
      message.success(`Issue #${issue.number} creado y vinculado`);
      setIssueNote(null);
    } catch (e) {
      message.error(String(e));
    } finally {
      setIssueLoading(false);
    }
  };

  const filtered = notes.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return n.is_resolved;
    if (filter === 'open') return !n.is_resolved;
    return n.note_type === filter;
  });

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>
          Notas ({notes.length})
        </Title>
        <Space>
          <Select
            size="small"
            value={filter}
            onChange={setFilter}
            options={FILTER_OPTIONS}
            style={{ width: 150 }}
          />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => { setEditingNote(null); setModalOpen(true); }}
          >
            Nueva nota
          </Button>
        </Space>
      </Space>

      {isLoading && <Spin />}

      {!isLoading && filtered.length === 0 && (
        <Empty
          description="Sin notas. ¡Agrega una para empezar!"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}

      {filtered.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onEdit={handleEdit}
          onDelete={(id) => deleteMut.mutate(id)}
          onToggleResolved={(id) => toggleMut.mutate(id)}
          onCreateIssue={(n) => setIssueNote(n)}
        />
      ))}

      <CreateNoteModal
        open={modalOpen}
        editingNote={editingNote}
        onSubmit={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditingNote(null); }}
      />

      {issueNote && githubOwner && githubRepo && (
        <CreateIssueModal
          open={!!issueNote}
          owner={githubOwner}
          repo={githubRepo}
          loading={issueLoading}
          onCreate={handleCreateIssue}
          onClose={() => setIssueNote(null)}
        />
      )}
    </div>
  );
}

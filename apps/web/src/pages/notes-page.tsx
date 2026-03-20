/// Global notes page — view all notes across projects, filter by project/type/resolved.
import { PlusOutlined } from '@ant-design/icons';
import {
  Button, Col, Empty, Row, Select, Skeleton, Space, Switch, Typography, notification,
} from 'antd';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useProjects,
  useNoteItems,
  useCreateNoteItem,
  useUpdateNoteItem,
  useDeleteNoteItem,
  useToggleNoteResolved,
} from '@devdock/hooks';
import type { NoteItem } from '@devdock/types';
import { NoteItemCard } from '../components/notes/note-item-card';
import { NoteItemForm, type NoteFormValues } from '../components/notes/note-item-form';
import { useLayoutSearch } from '../components/layout/web-app-layout';

const { Title } = Typography;
const CONTENT_MAX_WIDTH = 1200;

const NOTE_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'note', label: 'Note' },
  { value: 'task', label: 'Task' },
  { value: 'bug', label: 'Bug' },
  { value: 'idea', label: 'Idea' },
  { value: 'reminder', label: 'Reminder' },
];

// Inner component that loads notes for a single project
function ProjectNotes({
  projectId,
  typeFilter,
  showResolved,
  search,
  onEdit,
  onDelete,
  onToggle,
}: {
  projectId: string;
  typeFilter: string;
  showResolved: boolean;
  search: string;
  onEdit: (note: NoteItem) => void;
  onDelete: (id: string, projectId: string) => void;
  onToggle: (id: string) => void;
}) {
  const { data: notes = [], isLoading } = useNoteItems(projectId);

  const filtered = useMemo(() => notes.filter((n) => {
    if (!showResolved && n.is_resolved) return false;
    if (typeFilter && n.note_type !== typeFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [notes, typeFilter, showResolved, search]);

  if (isLoading) return <Skeleton active />;
  if (filtered.length === 0) return null;

  return (
    <>
      {filtered.map((note) => (
        <Col key={note.id} xs={24} md={12}>
          <NoteItemCard
            note={note}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleResolved={onToggle}
          />
        </Col>
      ))}
    </>
  );
}

export function NotesPage() {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { search } = useLayoutSearch();

  const createNote = useCreateNoteItem();
  const updateNote = useUpdateNoteItem();
  const deleteNote = useDeleteNoteItem();
  const toggleResolved = useToggleNoteResolved();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(routeProjectId ?? '');
  const [typeFilter, setTypeFilter] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  const projectOptions = [
    { value: '', label: 'All projects' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  // Which projects to display notes for
  const targetProjects = useMemo(() => {
    if (selectedProjectId) return projects.filter((p) => p.id === selectedProjectId);
    return projects;
  }, [projects, selectedProjectId]);

  async function handleNoteSubmit(values: NoteFormValues) {
    const projectId = editingNote?.project_id ?? selectedProjectId ?? projects[0]?.id;
    if (!projectId) return;
    try {
      if (editingNote) {
        await updateNote.mutateAsync({ id: editingNote.id, ...values });
        notification.success({ message: 'Note updated' });
      } else {
        await createNote.mutateAsync({ project_id: projectId, ...values });
        notification.success({ message: 'Note created' });
      }
      setModalOpen(false);
      setEditingNote(null);
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  return (
    <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, flex: 1 }}>Notes</Title>
        <Button
          type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditingNote(null); setModalOpen(true); }}
          disabled={projects.length === 0}
        >
          Add Note
        </Button>
      </div>

      {/* Filters */}
      <Space wrap style={{ marginBottom: 20 }}>
        <Select
          options={projectOptions}
          value={selectedProjectId}
          onChange={setSelectedProjectId}
          style={{ width: 200 }}
        />
        <Select
          options={NOTE_TYPE_OPTIONS}
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 160 }}
        />
        <Space>
          <Switch size="small" checked={showResolved} onChange={setShowResolved} />
          <span style={{ fontSize: 13 }}>Show resolved</span>
        </Space>
      </Space>

      {/* Notes grid */}
      {projectsLoading ? (
        <Skeleton active />
      ) : targetProjects.length === 0 ? (
        <Empty description="No projects yet" style={{ marginTop: 80 }} />
      ) : (
        <Row gutter={[16, 0]}>
          {targetProjects.map((p) => (
            <ProjectNotes
              key={p.id}
              projectId={p.id}
              typeFilter={typeFilter}
              showResolved={showResolved}
              search={search}
              onEdit={(note) => { setEditingNote(note); setModalOpen(true); }}
              onDelete={(id, pid) => deleteNote.mutate({ id, projectId: pid })}
              onToggle={(id) => toggleResolved.mutate(id)}
            />
          ))}
        </Row>
      )}

      <NoteItemForm
        open={modalOpen}
        editingNote={editingNote}
        loading={createNote.isPending || updateNote.isPending}
        onSubmit={handleNoteSubmit}
        onCancel={() => { setModalOpen(false); setEditingNote(null); }}
      />
    </div>
  );
}

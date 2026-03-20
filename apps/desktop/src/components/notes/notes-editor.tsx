import { CheckOutlined, EyeOutlined, FormOutlined } from '@ant-design/icons';
import { Button, Input, Segmented, Spin, Typography, notification } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotes, useSaveNotes } from '../../queries/use-desktop-only-queries';

const { Text } = Typography;

interface NotesEditorProps {
  projectId: string;
}

type EditorMode = 'edit' | 'preview';

/** Simple markdown-to-HTML renderer (no external deps) */
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, '$1<br>')
    .replace(/^<br>$/gm, '')
    || '<em style="color:#bbb">No content yet…</em>';
}

const AUTOSAVE_DELAY = 1500; // ms

export function NotesEditor({ projectId }: NotesEditorProps) {
  const { data: note, isLoading } = useNotes(projectId);
  const saveNotes = useSaveNotes();

  const [mode, setMode] = useState<EditorMode>('edit');
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync content when note loads
  useEffect(() => {
    if (note) {
      setContent(note.content);
      setIsDirty(false);
    }
  }, [note?.id]);

  const triggerAutosave = useCallback((newContent: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveNotes.mutateAsync({ projectId, content: newContent });
      setIsDirty(false);
    }, AUTOSAVE_DELAY);
  }, [projectId, saveNotes]);

  function handleChange(val: string) {
    setContent(val);
    setIsDirty(true);
    triggerAutosave(val);
  }

  async function handleManualSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saveNotes.mutateAsync({ projectId, content });
    setIsDirty(false);
    notification.success({ message: 'Notes saved', duration: 1 });
  }

  if (isLoading) return <Spin />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Segmented<EditorMode>
          size="small"
          options={[
            { value: 'edit', icon: <FormOutlined />, label: 'Edit' },
            { value: 'preview', icon: <EyeOutlined />, label: 'Preview' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <div style={{ flex: 1 }} />
        {isDirty && <Text type="secondary" style={{ fontSize: 11 }}>Unsaved…</Text>}
        {saveNotes.isPending && <Text type="secondary" style={{ fontSize: 11 }}>Saving…</Text>}
        <Button
          size="small"
          icon={<CheckOutlined />}
          onClick={handleManualSave}
          loading={saveNotes.isPending}
          disabled={!isDirty}
        >
          Save
        </Button>
      </div>

      {/* Editor / Preview */}
      {mode === 'edit' ? (
        <Input.TextArea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Write notes in Markdown…"
          style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 13 }}
          autoSize={false}
        />
      ) : (
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 12px',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            lineHeight: 1.7,
            fontSize: 14,
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}
    </div>
  );
}

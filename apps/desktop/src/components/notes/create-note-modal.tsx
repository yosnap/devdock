/// Modal for creating or editing a structured note item with markdown editor.
import MDEditor from '@uiw/react-md-editor';
import { Form, Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/app-store';
import type { NoteItem, NoteType } from '@devdock/types';

const NOTE_TYPE_OPTIONS: { value: NoteType; label: string }[] = [
  { value: 'note',     label: '📝 Nota' },
  { value: 'task',     label: '✅ Tarea' },
  { value: 'bug',      label: '🐛 Bug' },
  { value: 'idea',     label: '💡 Idea' },
  { value: 'reminder', label: '⏰ Recordatorio' },
];

interface NoteFormValues {
  title: string;
  content: string;
  note_type: NoteType;
}

interface CreateNoteModalProps {
  open: boolean;
  editingNote?: NoteItem | null;
  onSubmit: (values: NoteFormValues) => Promise<void>;
  onCancel: () => void;
}

export function CreateNoteModal({ open, editingNote, onSubmit, onCancel }: CreateNoteModalProps) {
  const [form] = Form.useForm<NoteFormValues>();
  const [content, setContent] = useState('');
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        editingNote
          ? { title: editingNote.title, note_type: editingNote.note_type as NoteType }
          : { title: '', note_type: 'note' }
      );
      setContent(editingNote?.content ?? '');
    }
  }, [open, editingNote, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit({ ...values, content });
    form.resetFields();
    setContent('');
  };

  const handleCancel = () => {
    form.resetFields();
    setContent('');
    onCancel();
  };

  return (
    <Modal
      title={editingNote ? 'Editar nota' : 'Nueva nota'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={editingNote ? 'Guardar' : 'Crear'}
      cancelText="Cancelar"
      width={580}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="note_type" label="Tipo" rules={[{ required: true }]}>
          <Select options={NOTE_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="title"
          label="Título"
          rules={[{ required: true, message: 'El título es obligatorio' }]}
        >
          <Input placeholder="Título de la nota..." maxLength={200} />
        </Form.Item>
        <Form.Item label="Descripción">
          <div data-color-mode={theme === 'dark' ? 'dark' : theme === 'auto' ? 'auto' : 'light'}>
            <MDEditor
              value={content}
              onChange={(val) => setContent(val ?? '')}
              height={220}
              preview="edit"
            />
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

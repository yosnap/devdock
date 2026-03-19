/// Modal for creating or editing a structured note item.
import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import type { NoteItem, NoteType } from '../../types';

const { TextArea } = Input;

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

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        editingNote
          ? { title: editingNote.title, content: editingNote.content, note_type: editingNote.note_type as NoteType }
          : { title: '', content: '', note_type: 'note' }
      );
    }
  }, [open, editingNote, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
    form.resetFields();
  };

  return (
    <Modal
      title={editingNote ? 'Editar nota' : 'Nueva nota'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={editingNote ? 'Guardar' : 'Crear'}
      cancelText="Cancelar"
      width={520}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="note_type"
          label="Tipo"
          rules={[{ required: true }]}
        >
          <Select options={NOTE_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="title"
          label="Título"
          rules={[{ required: true, message: 'El título es obligatorio' }]}
        >
          <Input placeholder="Título de la nota..." maxLength={200} />
        </Form.Item>
        <Form.Item name="content" label="Descripción">
          <TextArea
            rows={4}
            placeholder="Detalles, contexto, pasos para reproducir..."
            maxLength={2000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

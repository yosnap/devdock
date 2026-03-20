/// Modal form for creating or editing a note item.
/// Web version — uses plain textarea instead of MDEditor (no extra dep).
import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import type { NoteItem, NoteType } from '@devdock/types';

const NOTE_TYPE_OPTIONS: { value: NoteType; label: string }[] = [
  { value: 'note',     label: 'Note' },
  { value: 'task',     label: 'Task' },
  { value: 'bug',      label: 'Bug' },
  { value: 'idea',     label: 'Idea' },
  { value: 'reminder', label: 'Reminder' },
];

export interface NoteFormValues {
  title: string;
  content: string;
  note_type: NoteType;
}

interface NoteItemFormProps {
  open: boolean;
  editingNote?: NoteItem | null;
  loading?: boolean;
  onSubmit: (values: NoteFormValues) => Promise<void>;
  onCancel: () => void;
}

export function NoteItemForm({ open, editingNote, loading, onSubmit, onCancel }: NoteItemFormProps) {
  const [form] = Form.useForm<NoteFormValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        editingNote
          ? { title: editingNote.title, content: editingNote.content ?? '', note_type: editingNote.note_type as NoteType }
          : { title: '', content: '', note_type: 'note' }
      );
    }
  }, [open, editingNote, form]);

  async function handleOk() {
    const values = await form.validateFields();
    await onSubmit(values);
    form.resetFields();
  }

  function handleCancel() {
    form.resetFields();
    onCancel();
  }

  return (
    <Modal
      title={editingNote ? 'Edit note' : 'New note'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={editingNote ? 'Save' : 'Create'}
      confirmLoading={loading}
      width={540}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="note_type" label="Type" rules={[{ required: true }]}>
          <Select options={NOTE_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
          <Input placeholder="Note title…" maxLength={200} />
        </Form.Item>
        <Form.Item name="content" label="Content">
          <Input.TextArea rows={5} placeholder="Details…" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

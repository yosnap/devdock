/// Modal form for creating or editing a project link.
import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import type { ProjectLink } from '@devdock/types';

export interface LinkFormValues {
  title: string;
  url: string;
}

interface LinkFormModalProps {
  open: boolean;
  editingLink?: ProjectLink | null;
  loading?: boolean;
  onSubmit: (values: LinkFormValues) => Promise<void>;
  onCancel: () => void;
}

export function LinkFormModal({ open, editingLink, loading, onSubmit, onCancel }: LinkFormModalProps) {
  const [form] = Form.useForm<LinkFormValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        editingLink
          ? { title: editingLink.title, url: editingLink.url }
          : { title: '', url: '' }
      );
    }
  }, [open, editingLink, form]);

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
      title={editingLink ? 'Edit link' : 'Add link'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={editingLink ? 'Save' : 'Add'}
      confirmLoading={loading}
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
          <Input placeholder="e.g. Staging URL" maxLength={120} />
        </Form.Item>
        <Form.Item
          name="url"
          label="URL"
          rules={[
            { required: true, message: 'URL is required' },
            { type: 'url', message: 'Enter a valid URL' },
          ]}
        >
          <Input placeholder="https://…" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/// Modal for creating a new GitHub issue with GitHub-style markdown editor.
import MDEditor from '@uiw/react-md-editor';
import { Form, Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/app-store';

interface CreateIssueModalProps {
  open: boolean;
  owner: string;
  repo: string;
  loading: boolean;
  initialTitle?: string;
  initialBody?: string;
  onCreate: (title: string, body: string, labels: string[]) => Promise<void>;
  onClose: () => void;
}

interface FormValues {
  title: string;
  labels?: string[];
}

// Common GitHub label suggestions
const LABEL_OPTIONS = ['bug', 'enhancement', 'documentation', 'question', 'help wanted', 'good first issue'];

export function CreateIssueModal({ open, owner, repo, loading, initialTitle, initialBody, onCreate, onClose }: CreateIssueModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [body, setBody] = useState('');
  const theme = useAppStore((s) => s.theme);

  // Pre-fill form with note data when modal opens
  useEffect(() => {
    if (open) {
      form.setFieldsValue({ title: initialTitle ?? '' });
      setBody(initialBody ?? '');
    }
  }, [open, initialTitle, initialBody, form]);

  async function handleOk() {
    const values = await form.validateFields();
    await onCreate(values.title, body, values.labels ?? []);
    form.resetFields();
    setBody('');
  }

  function handleCancel() {
    form.resetFields();
    setBody('');
    onClose();
  }

  return (
    <Modal
      title={`New Issue — ${owner}/${repo}`}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Create Issue"
      confirmLoading={loading}
      destroyOnClose
      width={640}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Title is required' }]}
        >
          <Input placeholder="Brief description of the issue" />
        </Form.Item>

        <Form.Item label="Description">
          <div data-color-mode={theme === 'dark' ? 'dark' : theme === 'auto' ? 'auto' : 'light'}>
            <MDEditor
              value={body}
              onChange={(val) => setBody(val ?? '')}
              height={220}
              preview="edit"
            />
          </div>
        </Form.Item>

        <Form.Item name="labels" label="Labels">
          <Select
            mode="tags"
            placeholder="Add labels (type or select)"
            options={LABEL_OPTIONS.map((l) => ({ label: l, value: l }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

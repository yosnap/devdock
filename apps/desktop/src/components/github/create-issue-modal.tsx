/// Modal for creating a new GitHub issue with title, body, and labels.
import { Form, Input, Modal, Select } from 'antd';

interface CreateIssueModalProps {
  open: boolean;
  owner: string;
  repo: string;
  loading: boolean;
  onCreate: (title: string, body: string, labels: string[]) => Promise<void>;
  onClose: () => void;
}

interface FormValues {
  title: string;
  body?: string;
  labels?: string[];
}

// Common GitHub label suggestions
const LABEL_OPTIONS = ['bug', 'enhancement', 'documentation', 'question', 'help wanted', 'good first issue'];

export function CreateIssueModal({ open, owner, repo, loading, onCreate, onClose }: CreateIssueModalProps) {
  const [form] = Form.useForm<FormValues>();

  async function handleOk() {
    const values = await form.validateFields();
    await onCreate(values.title, values.body ?? '', values.labels ?? []);
    form.resetFields();
  }

  function handleCancel() {
    form.resetFields();
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
      width={560}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Title is required' }]}
        >
          <Input placeholder="Brief description of the issue" />
        </Form.Item>

        <Form.Item name="body" label="Description">
          <Input.TextArea
            rows={5}
            placeholder="Provide steps to reproduce, expected vs actual behavior, etc."
          />
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

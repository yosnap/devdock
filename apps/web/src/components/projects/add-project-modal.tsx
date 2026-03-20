/// Add/edit project modal for web — no path picker, no IDE selector, no Tauri deps.
import { Form, Input, Modal, Select, Switch, notification } from 'antd';
import { useEffect } from 'react';
import { useAddProject, useUpdateProject, useWorkspaces } from '@devdock/hooks';
import type { Project } from '@devdock/types';
import { STACK_OPTIONS } from '../shared/stack-utils';

interface AddProjectModalProps {
  open: boolean;
  project?: Project | null;
  onClose: () => void;
}

interface FormValues {
  name: string;
  description?: string;
  stack?: string;
  workspace_id?: string;
  tags?: string[];
  is_favorite?: boolean;
}

export function AddProjectModal({ open, project, onClose }: AddProjectModalProps) {
  const [form] = Form.useForm<FormValues>();
  const addProject = useAddProject();
  const updateProject = useUpdateProject();
  const { data: workspaces = [] } = useWorkspaces();

  const isEditing = Boolean(project);
  const isPending = addProject.isPending || updateProject.isPending;

  useEffect(() => {
    if (open && project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description ?? undefined,
        stack: project.stack ?? undefined,
        workspace_id: project.workspace_id ?? undefined,
        tags: project.tags ?? [],
        is_favorite: project.is_favorite,
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, project, form]);

  async function handleSubmit() {
    const values = await form.validateFields();
    try {
      if (isEditing && project) {
        await updateProject.mutateAsync({ id: project.id, ...values });
        notification.success({ message: 'Project updated' });
      } else {
        await addProject.mutateAsync({ ...values, name: values.name, path: '' });
        notification.success({ message: 'Project added' });
      }
      onClose();
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  const wsOptions = workspaces.map((ws) => ({ value: ws.id, label: ws.name }));

  return (
    <Modal
      title={isEditing ? 'Edit Project' : 'Add Project'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEditing ? 'Save' : 'Add Project'}
      confirmLoading={isPending}
      width={520}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Enter a project name' }]}>
          <Input placeholder="My Project" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} placeholder="Optional description…" />
        </Form.Item>

        <Form.Item label="Stack" name="stack">
          <Select options={STACK_OPTIONS} placeholder="Choose stack" allowClear />
        </Form.Item>

        <Form.Item label="Workspace" name="workspace_id">
          <Select options={wsOptions} placeholder="No workspace" allowClear />
        </Form.Item>

        <Form.Item label="Tags" name="tags">
          <Select mode="tags" placeholder="Add tags…" tokenSeparators={[',']} />
        </Form.Item>

        {isEditing && (
          <Form.Item label="Favorite" name="is_favorite" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

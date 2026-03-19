import { FolderOpenOutlined } from '@ant-design/icons';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Form, Input, Modal, Select, Switch, notification } from 'antd';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { detectProjectStack } from '../../services/tauri-commands';
import { useAddProject, useUpdateProject, PROJECT_KEYS } from '../../queries/use-projects-query';
import { useIdes } from '../../queries/use-ides-query';
import { useWorkspaces } from '../../queries/use-workspaces-query';
import { AvatarPicker } from './avatar-picker';
import type { Project } from '../../types';

interface AddProjectModalProps {
  open: boolean;
  project?: Project | null;
  onClose: () => void;
}

interface FormValues {
  name: string;
  path: string;
  description?: string;
  stack?: string;
  workspace_id?: string;
  default_ide_id?: string;
  tags?: string[];
  is_favorite?: boolean;
}

const STACK_OPTIONS = [
  { value: 'node', label: 'Node.js' },
  { value: 'rust', label: 'Rust' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java/Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'dotnet', label: '.NET' },
];

export function AddProjectModal({ open, project, onClose }: AddProjectModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [detecting, setDetecting] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);
  const qc = useQueryClient();

  const addProject = useAddProject();
  const updateProject = useUpdateProject();
  const { data: ides = [] } = useIdes();
  const { data: workspaces = [] } = useWorkspaces();

  const isEditing = Boolean(project);

  // Reset avatar override when modal opens with different project
  useEffect(() => {
    setAvatarOverride(undefined);
  }, [project?.id, open]);

  // Populate form when editing
  useEffect(() => {
    if (open && project) {
      form.setFieldsValue({
        name: project.name,
        path: project.path,
        description: project.description,
        stack: project.stack,
        workspace_id: project.workspace_id,
        default_ide_id: project.default_ide_id,
        tags: project.tags,
        is_favorite: project.is_favorite,
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, project, form]);

  async function pickFolder() {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (!selected) return;
      const path = typeof selected === 'string' ? selected : selected[0];
      if (!path) return;

      form.setFieldValue('path', path);

      // Auto-fill name from directory name
      const name = path.split('/').pop() ?? path;
      if (!form.getFieldValue('name')) {
        form.setFieldValue('name', name);
      }

      // Auto-detect stack
      setDetecting(true);
      try {
        const stack = await detectProjectStack(path);
        if (stack) form.setFieldValue('stack', stack);
      } finally {
        setDetecting(false);
      }
    } catch (e) {
      console.error('Folder picker error:', e);
    }
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    try {
      if (isEditing && project) {
        await updateProject.mutateAsync({ id: project.id, ...values });
        notification.success({ message: 'Project updated' });
      } else {
        await addProject.mutateAsync(values);
        notification.success({ message: 'Project added' });
      }
      onClose();
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  const ideOptions = ides.map((ide) => ({ value: ide.id, label: ide.name }));
  const wsOptions = workspaces.map((ws) => ({ value: ws.id, label: ws.name }));

  const isPending = addProject.isPending || updateProject.isPending;

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
        {/* Folder picker */}
        <Form.Item label="Project Path" name="path" rules={[{ required: true, message: 'Select a folder' }]}>
          <Input
            readOnly
            placeholder="Click to select folder…"
            suffix={<FolderOpenOutlined style={{ cursor: 'pointer' }} onClick={pickFolder} />}
            onClick={pickFolder}
            style={{ cursor: 'pointer' }}
          />
        </Form.Item>

        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Enter a project name' }]}>
          <Input placeholder="My Project" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} placeholder="Optional description…" />
        </Form.Item>

        <Form.Item label="Stack" name="stack" extra={detecting ? 'Detecting stack…' : undefined}>
          <Select options={STACK_OPTIONS} placeholder="Auto-detect or choose" allowClear loading={detecting} />
        </Form.Item>

        <Form.Item label="Workspace" name="workspace_id">
          <Select options={wsOptions} placeholder="No workspace" allowClear />
        </Form.Item>

        <Form.Item label="Default IDE" name="default_ide_id">
          <Select options={ideOptions} placeholder="Use default" allowClear />
        </Form.Item>

        <Form.Item label="Tags" name="tags">
          <Select mode="tags" placeholder="Add tags…" tokenSeparators={[',']} />
        </Form.Item>

        {isEditing && (
          <Form.Item label="Favorite" name="is_favorite" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
        {isEditing && project && (
          <Form.Item label="Imagen">
            <AvatarPicker
              entity="project"
              entityId={project.id}
              currentAvatar={avatarOverride === undefined ? project.avatar : (avatarOverride ?? undefined)}
              entityName={project.name}
              size={48}
              onAvatarChange={async (f) => {
                setAvatarOverride(f);
                await qc.invalidateQueries({ queryKey: PROJECT_KEYS.all });
              }}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

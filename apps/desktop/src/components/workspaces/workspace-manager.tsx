import {
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Avatar, Button, ColorPicker, Form, Input, Modal, Space, Table, Tooltip, Typography, notification } from 'antd';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspaces,
  WORKSPACE_KEYS,
} from '@devdock/hooks';
import { AvatarPicker } from '../projects/avatar-picker';
import { useAvatarUrl } from '../../hooks/use-avatar-url';
import type { Workspace } from '@devdock/types';

const { Text } = Typography;

const DEFAULT_COLOR = '#1677ff';
const COLOR_PRESETS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'];

interface WorkspaceFormValues {
  name: string;
}

/** Row cell that resolves avatar URL via hook (hooks require a component boundary) */
function WorkspaceNameCell({ ws }: { ws: Workspace }) {
  const avatarUrl = useAvatarUrl(ws.avatar);
  return (
    <Space>
      {avatarUrl ? (
        <Avatar size={28} src={avatarUrl} />
      ) : (
        <FolderOutlined style={{ color: ws.color ?? '#1677ff' }} />
      )}
      <Text strong>{ws.name}</Text>
    </Space>
  );
}

export function WorkspaceManager() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const createWs = useCreateWorkspace();
  const updateWs = useUpdateWorkspace();
  const deleteWs = useDeleteWorkspace();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  // Track color separately since ColorPicker returns an object, not a hex string
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);
  const [form] = Form.useForm<WorkspaceFormValues>();

  function openCreate() {
    setEditing(null);
    setSelectedColor(DEFAULT_COLOR);
    setAvatarOverride(undefined);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(ws: Workspace) {
    setEditing(ws);
    setSelectedColor(ws.color ?? DEFAULT_COLOR);
    setAvatarOverride(undefined);
    form.setFieldsValue({ name: ws.name });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateWs.mutateAsync({ id: editing.id, name: values.name, color: selectedColor });
        notification.success({ message: 'Workspace actualizado' });
      } else {
        await createWs.mutateAsync({ name: values.name, color: selectedColor });
        notification.success({ message: 'Workspace creado' });
      }
      setModalOpen(false);
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  function handleDelete(ws: Workspace) {
    Modal.confirm({
      title: `Delete workspace "${ws.name}"?`,
      content: 'Projects in this workspace will become unassigned.',
      okType: 'danger',
      onOk: () => deleteWs.mutateAsync(ws.id),
    });
  }

  // Current avatar for the workspace being edited
  const editingCurrentAvatar = avatarOverride === undefined
    ? editing?.avatar
    : (avatarOverride ?? undefined);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (_: string, ws: Workspace) => <WorkspaceNameCell ws={ws} />,
    },
    {
      title: 'Color',
      dataIndex: 'color',
      width: 80,
      render: (color: string) => (
        <div style={{ width: 20, height: 20, borderRadius: 4, background: color ?? '#1677ff', border: '1px solid var(--border-color)' }} />
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      width: 110,
      render: (d: string) => <Text type="secondary" style={{ fontSize: 12 }}>{d.slice(0, 10)}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, ws: Workspace) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(ws)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(ws)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const isPending = createWs.isPending || updateWs.isPending;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>Workspaces</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New Workspace
        </Button>
      </div>

      <Table
        dataSource={workspaces}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'No workspaces yet. Create one to organize your projects.' }}
      />

      <Modal
        title={editing ? 'Editar Workspace' : 'Nuevo Workspace'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Nombre" name="name" rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
            <Input placeholder="Mis Proyectos" />
          </Form.Item>
          <Form.Item label="Color">
            <Space>
              <ColorPicker
                value={selectedColor}
                presets={[{ label: 'Colores', colors: COLOR_PRESETS }]}
                onChange={(color) => setSelectedColor(color.toHexString())}
              />
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: selectedColor,
                  border: '1px solid var(--border-color)',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>{selectedColor}</Text>
            </Space>
          </Form.Item>
          {editing && (
            <Form.Item label="Imagen">
              <AvatarPicker
                entity="workspace"
                entityId={editing.id}
                currentAvatar={editingCurrentAvatar}
                entityName={editing.name}
                size={48}
                onAvatarChange={async (f) => {
                  setAvatarOverride(f);
                  await qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all });
                }}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

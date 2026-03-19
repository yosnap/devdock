import {
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, ColorPicker, Form, Input, Modal, Space, Table, Tooltip, Typography, notification } from 'antd';
import { useState } from 'react';
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspaces,
} from '../../queries/use-workspaces-query';
import type { Workspace } from '../../types';

const { Text } = Typography;

interface WorkspaceFormValues {
  name: string;
  color: string;
}

export function WorkspaceManager() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const createWs = useCreateWorkspace();
  const updateWs = useUpdateWorkspace();
  const deleteWs = useDeleteWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [form] = Form.useForm<WorkspaceFormValues>();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('color', '#1677ff');
    setModalOpen(true);
  }

  function openEdit(ws: Workspace) {
    setEditing(ws);
    form.setFieldsValue({ name: ws.name, color: ws.color ?? '#1677ff' });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateWs.mutateAsync({ id: editing.id, name: values.name, color: values.color });
        notification.success({ message: 'Workspace updated' });
      } else {
        await createWs.mutateAsync({ name: values.name, color: values.color });
        notification.success({ message: 'Workspace created' });
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

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (name: string, ws: Workspace) => (
        <Space>
          <FolderOutlined style={{ color: ws.color ?? '#1677ff' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Color',
      dataIndex: 'color',
      width: 80,
      render: (color: string) => (
        <div style={{ width: 20, height: 20, borderRadius: 4, background: color ?? '#1677ff', border: '1px solid #eee' }} />
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
        title={editing ? 'Edit Workspace' : 'New Workspace'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Enter a workspace name' }]}>
            <Input placeholder="My Projects" />
          </Form.Item>
          <Form.Item label="Color" name="color">
            <ColorPicker
              presets={[{
                label: 'Recommended',
                colors: ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'],
              }]}
              onChange={(_, hex) => form.setFieldValue('color', hex)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/// Lightweight modal for creating a workspace from anywhere in the app (e.g. sidebar).
/// Shares state via Zustand workspaceModalOpen flag.
import { ColorPicker, Form, Input, Modal, Space, Typography, notification } from 'antd';
import { useEffect, useState } from 'react';
import { useCreateWorkspace } from '@devdock/hooks';
import { useAppStore } from '../../stores/app-store';

const DEFAULT_COLOR = '#1677ff';
const COLOR_PRESETS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'];

interface FormValues { name: string }

export function QuickCreateWorkspaceModal() {
  const { workspaceModalOpen, setWorkspaceModalOpen } = useAppStore();
  const createWs = useCreateWorkspace();
  const [form] = Form.useForm<FormValues>();
  const [color, setColor] = useState(DEFAULT_COLOR);

  useEffect(() => {
    if (workspaceModalOpen) {
      form.resetFields();
      setColor(DEFAULT_COLOR);
    }
  }, [workspaceModalOpen, form]);

  async function handleOk() {
    const { name } = await form.validateFields();
    try {
      await createWs.mutateAsync({ name, color });
      notification.success({ message: `Workspace "${name}" creado` });
      setWorkspaceModalOpen(false);
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  return (
    <Modal
      title="Nuevo Workspace"
      open={workspaceModalOpen}
      onOk={handleOk}
      onCancel={() => setWorkspaceModalOpen(false)}
      okText="Crear"
      cancelText="Cancelar"
      confirmLoading={createWs.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
          <Input placeholder="Mis Proyectos" autoFocus />
        </Form.Item>
        <Form.Item label="Color">
          <Space>
            <ColorPicker
              value={color}
              presets={[{ label: 'Colores', colors: COLOR_PRESETS }]}
              onChange={(c) => setColor(c.toHexString())}
            />
            <div style={{ width: 24, height: 24, borderRadius: 4, background: color, border: '1px solid #eee' }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{color}</Typography.Text>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

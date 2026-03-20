/// Workspaces page — list with project count, full CRUD.
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button, Card, Col, ColorPicker, Empty, Form, Input, Modal,
  Popconfirm, Row, Select, Skeleton, Space, Tag, Typography, notification,
} from 'antd';
import { useMemo, useState } from 'react';
import {
  useCreateWorkspace, useDeleteWorkspace, useProjects,
  useUpdateWorkspace, useWorkspaces,
} from '@devdock/hooks';
import type { Workspace } from '@devdock/types';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const CONTENT_MAX_WIDTH = 1200;

const ICON_OPTIONS = [
  { value: 'FolderOutlined', label: 'Folder' },
  { value: 'AppstoreOutlined', label: 'Apps' },
  { value: 'CodeOutlined', label: 'Code' },
  { value: 'RocketOutlined', label: 'Rocket' },
  { value: 'StarOutlined', label: 'Star' },
];

interface WsFormValues {
  name: string;
  color: string;
  icon: string;
}

export function WorkspacesPage() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const { data: projects = [] } = useProjects();
  const createWs = useCreateWorkspace();
  const updateWs = useUpdateWorkspace();
  const deleteWs = useDeleteWorkspace();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWs, setEditingWs] = useState<Workspace | null>(null);
  const [form] = Form.useForm<WsFormValues>();
  const [colorValue, setColorValue] = useState('#1677ff');

  const projectCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach((p) => {
      if (p.workspace_id) map[p.workspace_id] = (map[p.workspace_id] ?? 0) + 1;
    });
    return map;
  }, [projects]);

  function openCreate() {
    setEditingWs(null);
    setColorValue('#1677ff');
    form.resetFields();
    form.setFieldsValue({ color: '#1677ff', icon: 'FolderOutlined' });
    setModalOpen(true);
  }

  function openEdit(ws: Workspace) {
    setEditingWs(ws);
    setColorValue(ws.color ?? '#1677ff');
    form.setFieldsValue({ name: ws.name, color: ws.color ?? '#1677ff', icon: ws.icon ?? 'FolderOutlined' });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    const payload = { ...values, color: colorValue };
    try {
      if (editingWs) {
        await updateWs.mutateAsync({ id: editingWs.id, ...payload });
        notification.success({ message: 'Workspace updated' });
      } else {
        await createWs.mutateAsync(payload);
        notification.success({ message: 'Workspace created' });
      }
      setModalOpen(false);
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWs.mutateAsync(id);
      notification.success({ message: 'Workspace deleted' });
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  const isPending = createWs.isPending || updateWs.isPending;

  return (
    <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, flex: 1 }}>Workspaces</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New Workspace
        </Button>
      </div>

      {isLoading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 3 }).map((_, i) => <Col key={i} xs={24} sm={12} lg={8}><Skeleton active /></Col>)}
        </Row>
      ) : workspaces.length === 0 ? (
        <Empty description="No workspaces yet" style={{ marginTop: 80 }} />
      ) : (
        <Row gutter={[16, 16]}>
          {workspaces.map((ws) => {
            const count = projectCountMap[ws.id] ?? 0;
            return (
              <Col key={ws.id} xs={24} sm={12} lg={8}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => navigate(`/?workspace=${ws.id}`)}
                  actions={[
                    <Button key="edit" type="text" size="small" icon={<EditOutlined />}
                      onClick={(e) => { e.stopPropagation(); openEdit(ws); }}
                    />,
                    <Popconfirm
                      key="delete"
                      title={`Delete "${ws.name}"?`}
                      description={count > 0 ? `${count} project(s) will be unassigned.` : undefined}
                      onConfirm={(e) => { e?.stopPropagation(); handleDelete(ws.id); }}
                      okText="Delete" okType="danger" cancelText="Cancel"
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>,
                  ]}
                >
                  <Space>
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: ws.color ?? '#1677ff', display: 'inline-block', flexShrink: 0,
                    }} />
                    <Text strong>{ws.name}</Text>
                  </Space>
                  <div style={{ marginTop: 8 }}>
                    <Tag>{count} project{count !== 1 ? 's' : ''}</Tag>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        title={editingWs ? 'Edit Workspace' : 'New Workspace'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isPending}
        width={420}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Personal Projects" />
          </Form.Item>
          <Form.Item label="Color">
            <ColorPicker
              value={colorValue}
              onChange={(_, hex) => setColorValue(hex)}
              showText
            />
          </Form.Item>
          <Form.Item name="icon" label="Icon">
            <Select options={ICON_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tooltip,
  Typography,
  notification,
} from 'antd';
import { useState } from 'react';
import {
  useCreateIde,
  useDeleteIde,
  useIdes,
  useSetDefaultIde,
  useUpdateIde,
} from '../../queries/use-ides-query';
import type { IdeConfig } from '@devdock/types';

const { Text } = Typography;

interface IdeFormValues {
  name: string;
  command: string;
  args: string;
  is_default: boolean;
}

export function IdeConfigPanel() {
  const { data: ides = [], isLoading } = useIdes();
  const createIde = useCreateIde();
  const updateIde = useUpdateIde();
  const deleteIde = useDeleteIde();
  const setDefault = useSetDefaultIde();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IdeConfig | null>(null);
  const [form] = Form.useForm<IdeFormValues>();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('args', '{path}');
    setModalOpen(true);
  }

  function openEdit(ide: IdeConfig) {
    setEditing(ide);
    form.setFieldsValue({ name: ide.name, command: ide.command, args: ide.args, is_default: ide.is_default });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateIde.mutateAsync({ id: editing.id, ...values });
        notification.success({ message: 'IDE updated' });
      } else {
        await createIde.mutateAsync(values);
        notification.success({ message: 'IDE added' });
      }
      setModalOpen(false);
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  function handleDelete(ide: IdeConfig) {
    Modal.confirm({
      title: `Delete "${ide.name}"?`,
      content: 'Projects using this IDE will lose their default configuration.',
      okType: 'danger',
      onOk: () => deleteIde.mutateAsync(ide.id),
    });
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (name: string, record: IdeConfig) => (
        <Space>
          <Text strong>{name}</Text>
          {record.is_default && <StarFilled style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    {
      title: 'Command',
      dataIndex: 'command',
      render: (cmd: string) => <Text code>{cmd}</Text>,
    },
    {
      title: 'Args Template',
      dataIndex: 'args',
      render: (args: string) => <Text code>{args}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: IdeConfig) => (
        <Space size={4}>
          <Tooltip title={record.is_default ? 'Default IDE' : 'Set as default'}>
            <Button
              type="text"
              size="small"
              icon={record.is_default ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
              onClick={() => !record.is_default && setDefault.mutate(record.id)}
              disabled={record.is_default}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const isPending = createIde.isPending || updateIde.isPending;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>IDE Configurations</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add IDE
        </Button>
      </div>

      <Table
        dataSource={ides}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
      />

      <Modal
        title={editing ? 'Edit IDE' : 'Add IDE'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="VS Code" />
          </Form.Item>
          <Form.Item label="CLI Command" name="command" rules={[{ required: true }]}>
            <Input placeholder="code" />
          </Form.Item>
          <Form.Item
            label="Args Template"
            name="args"
            extra="{path} will be replaced with the project path"
            rules={[{ required: true }]}
          >
            <Input placeholder="{path}" />
          </Form.Item>
          <Form.Item label="Set as Default" name="is_default" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

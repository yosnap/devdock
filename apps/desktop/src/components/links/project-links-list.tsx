import { DeleteOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { Button, Form, Input, Modal, Space, Tooltip, Typography, notification } from 'antd';
import { useState } from 'react';
import { useDeleteLink, useLinks, useUpsertLink } from '@devdock/hooks';
import type { ProjectLink, UpsertLinkPayload } from '@devdock/types';

const { Text, Link } = Typography;

interface ProjectLinksListProps {
  projectId: string;
}

interface LinkFormValues {
  title: string;
  url: string;
}

export function ProjectLinksList({ projectId }: ProjectLinksListProps) {
  const { data: links = [], isLoading } = useLinks(projectId);
  const upsertLink = useUpsertLink();
  const deleteLink = useDeleteLink();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectLink | null>(null);
  const [form] = Form.useForm<LinkFormValues>();

  function openAdd() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    const payload: UpsertLinkPayload = {
      id: editing?.id,
      project_id: projectId,
      title: values.title,
      url: values.url,
    };
    try {
      await upsertLink.mutateAsync(payload);
      setModalOpen(false);
      notification.success({ message: editing ? 'Link updated' : 'Link added' });
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  function handleDelete(link: ProjectLink) {
    Modal.confirm({
      title: `Delete "${link.title}"?`,
      okType: 'danger',
      onOk: () => deleteLink.mutateAsync({ id: link.id, projectId }),
    });
  }

  async function handleOpen(link: ProjectLink) {
    try {
      await openUrl(link.url);
    } catch (e) {
      notification.error({ message: `Cannot open URL: ${e}` });
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={openAdd}>
          Add Link
        </Button>
      </div>

      {isLoading ? null : links.length === 0 ? (
        <Text type="secondary">No links yet. Add URLs for docs, repos, staging, etc.</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {links.map((link) => (
            <div
              key={link.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
              }}
            >
              <LinkOutlined style={{ color: '#1677ff' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  ellipsis
                  onClick={() => handleOpen(link)}
                  style={{ cursor: 'pointer', display: 'block' }}
                >
                  {link.title}
                </Link>
                <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                  {link.url}
                </Text>
              </div>
              <Space size={4}>
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(link)}
                  />
                </Tooltip>
              </Space>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={editing ? 'Edit Link' : 'Add Link'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={upsertLink.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Title" name="title" rules={[{ required: true }]}>
            <Input placeholder="Documentation" />
          </Form.Item>
          <Form.Item
            label="URL"
            name="url"
            rules={[
              { required: true },
              { pattern: /^https?:\/\//, message: 'Must start with http:// or https://' },
            ]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

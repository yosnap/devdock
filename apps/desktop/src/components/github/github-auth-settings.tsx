/// GitHub authentication settings panel.
/// Users enter a Personal Access Token (PAT) which is stored in the OS keychain.
import { CheckCircleOutlined, DeleteOutlined, GithubOutlined, KeyOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Space, Typography, notification } from 'antd';
import { useDeleteGithubToken, useGithubTokenStatus, useSaveGithubToken } from '../../queries/use-github-query';

const { Text, Paragraph } = Typography;

export function GithubAuthSettings() {
  const { data: hasToken, isLoading } = useGithubTokenStatus();
  const saveToken = useSaveGithubToken();
  const deleteToken = useDeleteGithubToken();
  const [form] = Form.useForm<{ token: string }>();

  async function handleSave() {
    const { token } = await form.validateFields();
    try {
      await saveToken.mutateAsync(token.trim());
      form.resetFields();
      notification.success({ message: 'GitHub token saved securely' });
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  async function handleDelete() {
    try {
      await deleteToken.mutateAsync();
      notification.success({ message: 'GitHub token removed' });
    } catch (e) {
      notification.error({ message: String(e) });
    }
  }

  if (isLoading) return null;

  return (
    <div>
      <Space align="center" style={{ marginBottom: 16 }}>
        <GithubOutlined style={{ fontSize: 20 }} />
        <Text strong style={{ fontSize: 15 }}>GitHub Integration</Text>
      </Space>

      {hasToken ? (
        <div>
          <Alert
            type="success"
            icon={<CheckCircleOutlined />}
            showIcon
            message="GitHub token configured"
            description="Your Personal Access Token is stored securely in the OS keychain."
            style={{ marginBottom: 16 }}
          />
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete} loading={deleteToken.isPending}>
            Remove Token
          </Button>
        </div>
      ) : (
        <div>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            Create a GitHub Personal Access Token with <Text code>repo</Text> and{' '}
            <Text code>workflow</Text> scopes. The token is stored in your OS keychain —
            never in the app database.
          </Paragraph>
          <Form form={form} layout="vertical">
            <Form.Item
              name="token"
              label="Personal Access Token"
              rules={[{ required: true, message: 'Token is required' }]}
            >
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                style={{ maxWidth: 400 }}
              />
            </Form.Item>
            <Button type="primary" onClick={handleSave} loading={saveToken.isPending}>
              Save Token
            </Button>
          </Form>
        </div>
      )}
    </div>
  );
}

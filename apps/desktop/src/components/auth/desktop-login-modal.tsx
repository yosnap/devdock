/// Modal for DevDock sign-in: GitHub OAuth (recommended) or email/password.
/// GitHub opens the system browser; callback handled via deep-link devdock://auth/callback.
import { GithubOutlined } from '@ant-design/icons';
import { Alert, Button, Divider, Form, Input, Modal } from 'antd';
import { useState } from 'react';
import { useDesktopAuth } from '../../hooks/use-desktop-auth';
import { signInWithGithub } from '../../services/auth-service';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  email: string;
  password: string;
}

export function DesktopLoginModal({ open, onClose }: Props) {
  const { signIn } = useDesktopAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [form] = Form.useForm<FormValues>();

  async function handleGithubSignIn() {
    setError(null);
    setGithubLoading(true);
    try {
      await signInWithGithub();
      // Browser opens — close modal immediately, auth:signed-in event will update state
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGithubLoading(false);
    }
    // Don't set loading=false on success — modal closes anyway
  }

  async function handleSubmit(values: FormValues) {
    setError(null);
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      form.resetFields();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    form.resetFields();
    setError(null);
    onClose();
  }

  return (
    <Modal
      title="Sign in to DevDock"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={400}
      destroyOnHidden
    >
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* GitHub OAuth — recommended for users who signed up via GitHub */}
      <Button
        icon={<GithubOutlined />}
        loading={githubLoading}
        onClick={handleGithubSignIn}
        block
        size="large"
        style={{ marginBottom: 8 }}
      >
        Continue with GitHub
      </Button>

      <Divider plain style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        or sign in with email
      </Divider>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Enter a valid email' },
          ]}
        >
          <Input placeholder="you@example.com" autoComplete="email" />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: 'Password is required' }]}
        >
          <Input.Password placeholder="••••••••" autoComplete="current-password" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Sign In
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

/// Modal for email/password sign-in. Controlled by `open` prop.
/// On success the Tauri event auth:signed-in propagates to useDesktopAuth.
import { Alert, Button, Form, Input, Modal } from 'antd';
import { useState } from 'react';
import { useDesktopAuth } from '../../hooks/use-desktop-auth';

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
  const [form] = Form.useForm<FormValues>();

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
      destroyOnClose
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

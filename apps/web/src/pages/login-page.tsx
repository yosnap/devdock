/// Login page — email/password form + GitHub OAuth option.
import { GithubOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Form, Input, Tabs, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

const { Title, Text } = Typography;

export function LoginPage() {
  const { session, loading, signInWithEmail, signUpWithEmail, signInWithGitHub } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [session, loading, navigate]);

  async function handleSignIn({ email, password }: { email: string; password: string }) {
    setSubmitting(true);
    setError(null);
    const err = await signInWithEmail(email, password);
    if (err) setError(err);
    setSubmitting(false);
  }

  async function handleSignUp({ email, password }: { email: string; password: string }) {
    setSubmitting(true);
    setError(null);
    const err = await signUpWithEmail(email, password);
    if (err) setError(err);
    else setError('Check your email to confirm your account.');
    setSubmitting(false);
  }

  const emailForm = (onFinish: (v: { email: string; password: string }) => void, label: string) => (
    <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 8 }}>
      {error && <Alert message={error} type={error.includes('Check') ? 'success' : 'error'} style={{ marginBottom: 16 }} showIcon />}
      <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
        <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Min 6 characters' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
      </Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={submitting}>{label}</Button>
    </Form>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
      <Card style={{ width: 380, borderRadius: 12 }} styles={{ body: { padding: 40 } }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 4 }}>DevDock</Title>
          <Text type="secondary">Your project command center</Text>
        </div>

        <Tabs defaultActiveKey="signin" centered onChange={() => setError(null)} items={[
          { key: 'signin', label: 'Sign in', children: emailForm(handleSignIn, 'Sign in') },
          { key: 'signup', label: 'Sign up', children: emailForm(handleSignUp, 'Create account') },
        ]} />

        <Divider plain><Text type="secondary" style={{ fontSize: 12 }}>or</Text></Divider>

        <Button icon={<GithubOutlined />} size="large" block onClick={signInWithGitHub} loading={loading}>
          Continue with GitHub
        </Button>
      </Card>
    </div>
  );
}

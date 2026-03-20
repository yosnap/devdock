/// Login page — centered card with GitHub OAuth sign-in button.
import { GithubOutlined } from '@ant-design/icons';
import { Button, Card, Typography } from 'antd';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

const { Title, Text } = Typography;

export function LoginPage() {
  const { session, loading, signInWithGitHub } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [session, loading, navigate]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-base)',
    }}>
      <Card style={{ width: 360, textAlign: 'center', borderRadius: 12 }} styles={{ body: { padding: 40 } }}>
        <Title level={2} style={{ marginBottom: 4 }}>DevDock</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
          Your project command center
        </Text>
        <Button
          type="primary"
          size="large"
          icon={<GithubOutlined />}
          block
          onClick={signInWithGitHub}
          loading={loading}
        >
          Sign in with GitHub
        </Button>
      </Card>
    </div>
  );
}

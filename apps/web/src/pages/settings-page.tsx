/// Settings page — URL-friendly tabs: /settings/profile, /settings/appearance.
/// Profile reads from Supabase auth user metadata; appearance controls theme.
import {
  DesktopOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import {
  Avatar, Button, Card, Form, Input, Radio,
  Space, Tabs, Typography, notification,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AppTheme } from '@devdock/types';
import { useAuth } from '../hooks/use-auth';
import { useWebTheme } from '../hooks/use-web-theme';
import { supabase } from '../lib/supabase';

const { Title, Text } = Typography;
const CONTENT_MAX_WIDTH = 800;

interface ProfileFormValues {
  display_name: string;
  github_username: string;
  avatar_url: string;
}

function ProfileTab() {
  const { user } = useAuth();
  const [form] = Form.useForm<ProfileFormValues>();
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata ?? {};
    const values = {
      display_name: (meta['full_name'] as string | undefined) ?? '',
      github_username: (meta['user_name'] as string | undefined) ?? '',
      avatar_url: (meta['avatar_url'] as string | undefined) ?? '',
    };
    form.setFieldsValue(values);
    setAvatarPreview(values.avatar_url);
  }, [user, form]);

  async function handleSave() {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: values.display_name,
          user_name: values.github_username,
          avatar_url: values.avatar_url,
        },
      });
      if (error) throw error;
      notification.success({ message: 'Profile saved' });
    } catch (e) {
      notification.error({ message: String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ maxWidth: 480 }}>
      <Space style={{ marginBottom: 20 }}>
        <Avatar size={56} src={avatarPreview || undefined} />
        <div>
          <Text strong>{user?.email}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>GitHub OAuth account</Text>
        </div>
      </Space>

      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item name="display_name" label="Display Name">
          <Input placeholder="Your name" />
        </Form.Item>
        <Form.Item name="github_username" label="GitHub Username">
          <Input placeholder="octocat" prefix="@" />
        </Form.Item>
        <Form.Item name="avatar_url" label="Avatar URL">
          <Input
            placeholder="https://avatars.githubusercontent.com/…"
            onChange={(e) => setAvatarPreview(e.target.value)}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Save Profile
        </Button>
      </Form>
    </Card>
  );
}

function AppearanceTab() {
  const { theme, applyTheme } = useWebTheme();

  return (
    <Card style={{ maxWidth: 480 }}>
      <Title level={5} style={{ marginBottom: 16 }}>Theme</Title>
      <Radio.Group
        value={theme}
        onChange={(e) => applyTheme(e.target.value as AppTheme)}
      >
        <Space direction="vertical">
          <Radio value="light">
            <Space><SunOutlined /> Light</Space>
          </Radio>
          <Radio value="dark">
            <Space><MoonOutlined /> Dark</Space>
          </Radio>
          <Radio value="auto">
            <Space><DesktopOutlined /> System (auto)</Space>
          </Radio>
        </Space>
      </Radio.Group>
    </Card>
  );
}

const VALID_TABS = ['profile', 'appearance'] as const;
type SettingsTab = typeof VALID_TABS[number];

export function SettingsPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab: SettingsTab = VALID_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : 'profile';

  const tabItems = [
    { key: 'profile', label: 'Profile', children: <ProfileTab /> },
    { key: 'appearance', label: 'Appearance', children: <AppearanceTab /> },
  ];

  return (
    <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>Settings</Title>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => navigate(`/settings/${key}`)}
        items={tabItems}
      />
    </div>
  );
}

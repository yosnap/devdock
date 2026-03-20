/// User avatar dropdown in the top bar — shows user info and sign-out option.
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Dropdown, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '../../hooks/use-auth';

const { Text } = Typography;

export function UserMenu() {
  const { user, signOut } = useAuth();

  const items: MenuProps['items'] = [
    {
      key: 'email',
      label: <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'signout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      danger: true,
      onClick: signOut,
    },
  ];

  const avatarUrl = user?.user_metadata?.['avatar_url'] as string | undefined;
  const displayName = (user?.user_metadata?.['full_name'] as string | undefined)
    ?? user?.email
    ?? 'User';

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Avatar
        src={avatarUrl}
        icon={!avatarUrl ? <UserOutlined /> : undefined}
        style={{ cursor: 'pointer', flexShrink: 0 }}
        aria-label={displayName}
      />
    </Dropdown>
  );
}

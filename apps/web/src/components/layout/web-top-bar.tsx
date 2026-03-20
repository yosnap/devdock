/// Top bar for web app — search input and user avatar menu.
import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { UserMenu } from '../auth/user-menu';

interface WebTopBarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function WebTopBar({ search, onSearchChange }: WebTopBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 24px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-base)',
      }}
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ maxWidth: 280 }}
        allowClear
      />
      <div style={{ flex: 1 }} />
      <UserMenu />
    </div>
  );
}

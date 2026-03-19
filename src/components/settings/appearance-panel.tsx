/// Appearance settings: theme selection (light / dark / auto).
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Card, Radio, Space, Typography } from 'antd';
import { useTheme } from '../../hooks/use-theme';
import type { AppTheme } from '../../types';

const { Title, Text } = Typography;

const THEME_OPTIONS: { value: AppTheme; label: React.ReactNode }[] = [
  { value: 'light', label: <><SunOutlined /> Claro</> },
  { value: 'dark',  label: <><MoonOutlined /> Oscuro</> },
  { value: 'auto',  label: <><DesktopOutlined /> Automático</> },
];

export function AppearancePanel() {
  const { theme, applyTheme } = useTheme();

  return (
    <div>
      <Title level={5} style={{ marginTop: 0 }}>Apariencia</Title>
      <Card>
        <Space direction="vertical" size={8}>
          <Text type="secondary">Selecciona el tema de la interfaz</Text>
          <Radio.Group
            value={theme}
            onChange={(e) => applyTheme(e.target.value as AppTheme)}
            optionType="button"
            buttonStyle="solid"
          >
            {THEME_OPTIONS.map(({ value, label }) => (
              <Radio.Button key={value} value={value}>{label}</Radio.Button>
            ))}
          </Radio.Group>
          {theme === 'auto' && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Sigue la preferencia del sistema operativo automáticamente.
            </Text>
          )}
        </Space>
      </Card>
    </div>
  );
}

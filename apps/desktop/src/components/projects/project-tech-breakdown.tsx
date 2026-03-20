/// Tech breakdown panel: shows framework, DB, ORM, testing, devops tags with versions.
import { useQuery } from '@tanstack/react-query';
import { Divider, Space, Spin, Tag, Typography } from 'antd';
import { analyzeProjectTech } from '../../services/tauri-commands';
import type { TechItem } from '@devdock/types';

const { Text } = Typography;

interface Section {
  label: string;
  items: TechItem[];
  color: string;
}

interface ProjectTechBreakdownProps {
  id: string;
  path: string;
}

function formatItem(item: TechItem): string {
  return item.version ? `${item.name} ${item.version}` : item.name;
}

export function ProjectTechBreakdown({ id, path }: ProjectTechBreakdownProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['tech_breakdown', id],
    queryFn: () => analyzeProjectTech(id, path),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <Spin size="small" />;
  if (!data) return null;

  const sections: Section[] = [
    { label: 'Framework',     items: data.frameworks, color: 'blue'   },
    { label: 'Base de datos', items: data.databases,  color: 'green'  },
    { label: 'ORM / Query',  items: data.orms,       color: 'purple' },
    { label: 'Testing',      items: data.testing,     color: 'orange' },
    { label: 'DevOps',       items: data.devops,      color: 'cyan'   },
  ].filter((s) => s.items.length > 0);

  if (!data.language && sections.length === 0) {
    return <Text type="secondary" style={{ fontSize: 12 }}>No se detectaron tecnologías</Text>;
  }

  return (
    <div style={{ fontSize: 12 }}>
      {data.language && (
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            Lenguaje
          </Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="geekblue">{data.language}</Tag>
          </div>
        </div>
      )}
      {sections.map(({ label, items, color }, i) => (
        <div key={label}>
          {(data.language || i > 0) && <Divider style={{ margin: '8px 0' }} />}
          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            {label}
          </Text>
          <div style={{ marginTop: 4 }}>
            <Space size={4} wrap>
              {items.map((item) => (
                <Tag key={item.name} color={color} style={{ margin: 0 }}>{formatItem(item)}</Tag>
              ))}
            </Space>
          </div>
        </div>
      ))}
    </div>
  );
}

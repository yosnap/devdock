/// Tech breakdown panel: shows framework, DB, ORM, testing, devops tags for a project.
import { useQuery } from '@tanstack/react-query';
import { Divider, Space, Spin, Tag, Typography } from 'antd';
import { analyzeProjectTech } from '../../services/tauri-commands';

const { Text } = Typography;

interface Section {
  label: string;
  items: string[];
  color: string;
}

interface ProjectTechBreakdownProps {
  path: string;
}

export function ProjectTechBreakdown({ path }: ProjectTechBreakdownProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['tech_breakdown', path],
    queryFn: () => analyzeProjectTech(path),
    staleTime: 5 * 60_000, // 5 min — filesystem doesn't change often
  });

  if (isLoading) return <Spin size="small" />;
  if (!data) return null;

  const sections: Section[] = [
    { label: 'Framework',  items: data.frameworks, color: 'blue'    },
    { label: 'Base de datos', items: data.databases,  color: 'green'   },
    { label: 'ORM / Query', items: data.orms,       color: 'purple'  },
    { label: 'Testing',    items: data.testing,     color: 'orange'  },
    { label: 'DevOps',     items: data.devops,      color: 'cyan'    },
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
                <Tag key={item} color={color} style={{ margin: 0 }}>{item}</Tag>
              ))}
            </Space>
          </div>
        </div>
      ))}
    </div>
  );
}

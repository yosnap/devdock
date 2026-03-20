/// Health dashboard — read-only view of projects needing attention, sorted worst first.
import { Empty, List, Skeleton, Tag, Typography } from 'antd';
import { useProjectsNeedingAttention } from '@devdock/hooks';
import { HealthScoreBadge } from '../components/shared/health-score-badge';
import { stackColor, stackLabel } from '../components/shared/stack-utils';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const CONTENT_MAX_WIDTH = 1200;

export function HealthDashboardPage() {
  const { data: projects = [], isLoading } = useProjectsNeedingAttention();
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Health Dashboard</Title>
        <Text type="secondary">Projects scoring below 80 — sorted by worst health first.</Text>
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : projects.length === 0 ? (
        <Empty
          description="All projects are healthy!"
          style={{ marginTop: 80 }}
        />
      ) : (
        <List
          dataSource={projects}
          renderItem={(project) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '12px 16px', borderRadius: 6 }}
              onClick={() => navigate(`/projects/${project.id}`)}
              actions={[
                <HealthScoreBadge key="score" score={project.health_score} size="medium" />,
              ]}
            >
              <List.Item.Meta
                title={
                  <Text strong style={{ fontSize: 15 }}>{project.name}</Text>
                }
                description={
                  <span>
                    <Tag color={project.status === 'active' ? 'green' : 'orange'}>
                      {project.status}
                    </Tag>
                    {project.stack && (
                      <Tag color={stackColor(project.stack)}>{stackLabel(project.stack)}</Tag>
                    )}
                  </span>
                }
              />
            </List.Item>
          )}
          bordered
          style={{ background: 'var(--bg-base)', borderRadius: 8 }}
        />
      )}
    </div>
  );
}

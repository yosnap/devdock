/// "Needs Attention" view — lists projects with health score below the threshold.
/// Sorted by worst score first. Accessible from the sidebar.
import { Empty, Spin, Typography } from 'antd';
import { useProjectsNeedingAttention } from '../../queries/use-health-query';
import { stackColor, stackLabel } from '../projects/stack-utils';
import { HealthScoreBadge } from './health-score-badge';

const { Text } = Typography;

export function NeedsAttentionView() {
  const { data: projects = [], isLoading } = useProjectsNeedingAttention();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Empty
        description="All projects are healthy"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: 64 }}
      />
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {projects.length} project{projects.length !== 1 ? 's' : ''} need attention
      </Text>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <HealthScoreBadge score={p.health_score} size="medium" />

            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong ellipsis style={{ display: 'block' }}>{p.name}</Text>
              <Text
                type="secondary"
                style={{ fontSize: 11, display: 'block' }}
                ellipsis
              >
                {p.path.length > 50 ? '…' + p.path.slice(-47) : p.path}
              </Text>
            </div>

            {p.stack && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: stackColor(p.stack) + '22',
                  color: stackColor(p.stack),
                  fontSize: 11,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {stackLabel(p.stack)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

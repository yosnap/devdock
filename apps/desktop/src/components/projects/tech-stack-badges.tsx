/// Tech stack badges: logo + tech version. App version shown separately.
import { Space, Tooltip, Typography } from 'antd';
import type { TechBreakdown, TechItem } from '@devdock/types';

const { Text } = Typography;

const DEVICON_MAP: Record<string, string> = {
  'Next.js': 'nextjs', 'Nuxt.js': 'nuxtjs', 'React': 'react',
  'Vue.js': 'vuejs', 'Angular': 'angularjs', 'Svelte': 'svelte',
  'Astro': 'astro', 'Express': 'express', 'Fastify': 'fastify', 'NestJS': 'nestjs',
  'Electron': 'electron', 'Tauri': 'tauri',
  'FastAPI': 'fastapi', 'Django': 'django', 'Flask': 'flask',
  'Spring Boot': 'spring',
  'PostgreSQL': 'postgresql', 'MySQL': 'mysql', 'MongoDB': 'mongodb',
  'Redis': 'redis', 'SQLite': 'sqlite',
  'Node.js / TypeScript': 'typescript', 'Node.js / JavaScript': 'nodejs',
  'Rust': 'rust', 'Python': 'python', 'Go': 'go',
  'Java': 'java', 'Kotlin': 'kotlin',
};

const CDN = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons';

function TechBadge({ item }: { item: TechItem }) {
  const slug = DEVICON_MAP[item.name];
  const label = item.version ? `${item.name} ${item.version}` : item.name;

  return (
    <Tooltip title={label}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {slug ? (
          <img src={`${CDN}/${slug}/${slug}-original.svg`} alt={item.name}
            style={{ width: 16, height: 16 }}
          />
        ) : (
          <Text style={{ fontSize: 10, color: 'var(--icon-muted)' }}>{item.name}</Text>
        )}
        {item.version && (
          <Text type="secondary" style={{ fontSize: 10 }}>{item.version}</Text>
        )}
      </span>
    </Tooltip>
  );
}

interface TechStackBadgesProps {
  breakdown: TechBreakdown;
}

export function TechStackBadges({ breakdown }: TechStackBadgesProps) {
  const items: TechItem[] = [];

  // Main framework
  if (breakdown.frameworks.length > 0) items.push(breakdown.frameworks[0]);
  // Language fallback
  if (items.length === 0 && breakdown.language) {
    items.push({ name: breakdown.language });
  }
  // Database
  if (breakdown.databases.length > 0) items.push(breakdown.databases[0]);

  if (items.length === 0) return null;

  return (
    <Space size={8} align="center" style={{ flexWrap: 'wrap' }}>
      {items.map((item) => <TechBadge key={item.name} item={item} />)}
    </Space>
  );
}

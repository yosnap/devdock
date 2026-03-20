// Single row in the projects FlatList
// Shows name, version, tech logos, tags, workspace dot, health score, favorite star

import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Project, TechItem } from '@devdock/types';
import { HealthScoreBadge } from './health-score-badge';

const DEVICON_MAP: Record<string, string> = {
  'Next.js': 'nextjs', 'Nuxt.js': 'nuxtjs', 'React': 'react',
  'Vue.js': 'vuejs', 'Angular': 'angularjs', 'Svelte': 'svelte',
  'Express': 'express', 'NestJS': 'nestjs', 'Electron': 'electron',
  'Tauri': 'tauri', 'FastAPI': 'fastapi', 'Django': 'django',
  'PostgreSQL': 'postgresql', 'MySQL': 'mysql', 'MongoDB': 'mongodb',
  'Redis': 'redis', 'SQLite': 'sqlite',
};

const CDN = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons';

function TechBadge({ item }: { item: TechItem }) {
  const slug = DEVICON_MAP[item.name];
  return (
    <View style={styles.techBadge}>
      {slug && (
        <Image source={{ uri: `${CDN}/${slug}/${slug}-original.svg` }}
          style={styles.techIcon} />
      )}
      <Text style={styles.techText}>
        {slug ? (item.version ?? item.name) : (item.version ? `${item.name} ${item.version}` : item.name)}
      </Text>
    </View>
  );
}

interface Props {
  project: Project;
  workspaceName?: string;
  workspaceColor?: string;
  onPress: () => void;
}

export function ProjectListItem({ project, workspaceName, workspaceColor, onPress }: Props) {
  // Parse tech_breakdown if it's a string
  const tb = typeof project.tech_breakdown === 'string'
    ? (() => { try { return JSON.parse(project.tech_breakdown); } catch { return null; } })()
    : project.tech_breakdown ?? null;

  const techItems: TechItem[] = [];
  if (tb) {
    if (tb.frameworks?.length > 0) techItems.push(tb.frameworks[0]);
    if (tb.databases?.length > 0) techItems.push(tb.databases[0]);
  }

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.main}>
        {/* Row 1: Name + favorite */}
        <View style={styles.nameRow}>
          {workspaceColor && (
            <View style={[styles.dot, { backgroundColor: workspaceColor }]} />
          )}
          <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
          {project.is_favorite && (
            <Ionicons name="star" size={14} color="#eab308" style={styles.star} />
          )}
        </View>

        {/* Row 2: Version */}
        {tb?.version && (
          <Text style={styles.version}>v{tb.version}</Text>
        )}

        {/* Row 3: Tech logos */}
        {techItems.length > 0 && (
          <View style={styles.techRow}>
            {techItems.map((item) => <TechBadge key={item.name} item={item} />)}
          </View>
        )}

        {/* Row 4: Tags / stack */}
        <View style={styles.meta}>
          {!tb && project.stack && (
            <View style={styles.stackBadge}>
              <Text style={styles.stackText}>{project.stack}</Text>
            </View>
          )}
          {workspaceName && (
            <Text style={styles.workspace} numberOfLines={1}>{workspaceName}</Text>
          )}
        </View>
      </View>
      {typeof project.health_score === 'number' && project.health_score >= 0 && (
        <HealthScoreBadge score={project.health_score} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  main: { flex: 1, marginRight: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#f8fafc', flex: 1 },
  star: { marginLeft: 6 },
  version: { fontSize: 11, color: '#64748b', marginBottom: 4, marginLeft: 16 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  techBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  techIcon: { width: 14, height: 14 },
  techText: { fontSize: 10, color: '#94a3b8' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stackBadge: {
    backgroundColor: '#1e293b',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stackText: { fontSize: 11, color: '#94a3b8' },
  workspace: { fontSize: 12, color: '#64748b' },
});

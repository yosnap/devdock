// Single row in the projects FlatList
// Shows name, stack badge, workspace dot, health score, favorite star

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Project } from '@devdock/types';
import { HealthScoreBadge } from './health-score-badge';

interface Props {
  project: Project;
  workspaceName?: string;
  workspaceColor?: string;
  onPress: () => void;
}

export function ProjectListItem({ project, workspaceName, workspaceColor, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.main}>
        <View style={styles.nameRow}>
          {workspaceColor && (
            <View style={[styles.dot, { backgroundColor: workspaceColor }]} />
          )}
          <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
          {project.is_favorite && (
            <Ionicons name="star" size={14} color="#eab308" style={styles.star} />
          )}
        </View>
        <View style={styles.meta}>
          {project.stack && (
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
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#f8fafc', flex: 1 },
  star: { marginLeft: 6 },
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

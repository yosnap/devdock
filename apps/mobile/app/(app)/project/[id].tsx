// Dynamic project detail route — resolves project by id param, delegates to ProjectDetailScreen

import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProjects, useWorkspaces } from '@devdock/hooks';
import { useMemo } from 'react';
import { ProjectDetailScreen } from '../../../src/screens/project-detail-screen';

export default function ProjectDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: projects = [], isLoading } = useProjects();
  const { data: workspaces = [] } = useWorkspaces();

  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id]);
  const workspace = useMemo(
    () => workspaces.find((ws) => ws.id === project?.workspace_id),
    [workspaces, project]
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#818cf8" size="large" />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Project not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color="#818cf8" />
          <Text style={styles.backLabel}>Projects</Text>
        </TouchableOpacity>
      </View>
      <ProjectDetailScreen project={project} workspaceName={workspace?.name} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  navBar: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backLabel: { fontSize: 16, color: '#818cf8', marginLeft: 4 },
  errorText: { color: '#94a3b8', fontSize: 16, marginBottom: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1e293b', borderRadius: 8 },
  backText: { color: '#818cf8', fontSize: 14 },
});

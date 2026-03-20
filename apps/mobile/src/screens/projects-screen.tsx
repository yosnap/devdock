// Projects list screen — searchable FlatList with pull-to-refresh and FAB

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects } from '@devdock/hooks';
import { useWorkspaces } from '@devdock/hooks';
import { ProjectListItem } from '../components/project-list-item';
import { AddProjectModal } from '../components/add-project-modal';
import type { Project } from '@devdock/types';

export function ProjectsScreen() {
  const router = useRouter();
  const { data: projects = [], isLoading, refetch, isRefetching } = useProjects();
  const { data: workspaces = [] } = useWorkspaces();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const wsMap = useMemo(
    () => new Map(workspaces.map((ws) => [ws.id, ws])),
    [workspaces]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p: Project) =>
        p.name.toLowerCase().includes(q) ||
        p.stack?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#818cf8" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Search projects..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const ws = item.workspace_id ? wsMap.get(item.workspace_id) : undefined;
          return (
            <ProjectListItem
              project={item}
              workspaceName={ws?.name}
              workspaceColor={ws?.color ?? undefined}
              onPress={() => router.push({ pathname: '/(app)/project/[id]', params: { id: item.id } })}
            />
          );
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{search ? 'No results.' : 'No projects yet.'}</Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyFlex : undefined}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddProjectModal
        visible={showModal}
        workspaces={workspaces}
        onClose={() => setShowModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, color: '#f8fafc', fontSize: 15, paddingVertical: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#475569', fontSize: 15 },
  emptyFlex: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});

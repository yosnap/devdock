// Workspaces screen — list with project counts, create/delete actions

import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaces, useCreateWorkspace, useDeleteWorkspace } from '@devdock/hooks';
import { useProjects } from '@devdock/hooks';
import type { Workspace } from '@devdock/types';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function WorkspacesScreen() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const { data: projects = [] } = useProjects();
  const createWs = useCreateWorkspace();
  const deleteWs = useDeleteWorkspace();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  function projectCount(wsId: string) {
    return projects.filter((p) => p.workspace_id === wsId).length;
  }

  async function handleCreate() {
    if (!name.trim()) { setFormError('Name is required.'); return; }
    setFormError(null);
    try {
      await createWs.mutateAsync({ name: name.trim(), color: selectedColor });
      setName('');
      setShowForm(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create workspace.');
    }
  }

  function handleDelete(ws: Workspace) {
    Alert.alert('Delete workspace', `Delete "${ws.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteWs.mutate(ws.id),
      },
    ]);
  }

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#818cf8" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workspaces}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: item.color ?? '#64748b' }]} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.count}>{projectCount(item.id)} projects</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>No workspaces yet.</Text></View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Workspace</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {formError && <Text style={styles.error}>{formError}</Text>}
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} placeholder="Workspace name" placeholderTextColor="#475569"
            value={name} onChangeText={setName} />
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity key={c} onPress={() => setSelectedColor(c)}
                style={[styles.colorChip, { backgroundColor: c }, selectedColor === c && styles.colorChipActive]}
              />
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={createWs.isPending}>
            {createWs.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 14 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#f8fafc' },
  count: { fontSize: 12, color: '#64748b', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#475569', fontSize: 15 },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  modal: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc' },
  cancel: { fontSize: 15, color: '#818cf8' },
  error: { color: '#f87171', marginBottom: 12, fontSize: 13 },
  label: { fontSize: 13, color: '#94a3b8', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  colorRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  colorChip: { width: 32, height: 32, borderRadius: 16 },
  colorChipActive: { borderWidth: 3, borderColor: '#f8fafc' },
  button: { backgroundColor: '#6366f1', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});

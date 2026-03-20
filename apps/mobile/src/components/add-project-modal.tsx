// Modal form to create a new project from mobile
// path is sent as '' for web/mobile compat (desktop sets real path)

import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type { Workspace } from '@devdock/types';
import { useAddProject } from '../hooks/use-projects';

interface Props {
  visible: boolean;
  workspaces: Workspace[];
  onClose: () => void;
}

export function AddProjectModal({ visible, workspaces, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stack, setStack] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addProject = useAddProject();

  function reset() {
    setName('');
    setDescription('');
    setStack('');
    setWorkspaceId(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    setError(null);
    try {
      await addProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        stack: stack.trim() || undefined,
        workspace_id: workspaceId ?? undefined,
        path: '',
      });
      reset();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create project.');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>New Project</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} placeholder="My project" placeholderTextColor="#475569"
          value={name} onChangeText={setName} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} placeholder="Optional description"
          placeholderTextColor="#475569" value={description} onChangeText={setDescription}
          multiline numberOfLines={3} />

        <Text style={styles.label}>Stack</Text>
        <TextInput style={styles.input} placeholder="e.g. React, Node.js" placeholderTextColor="#475569"
          value={stack} onChangeText={setStack} />

        <Text style={styles.label}>Workspace</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, !workspaceId && styles.chipActive]}
            onPress={() => setWorkspaceId(null)}
          >
            <Text style={[styles.chipText, !workspaceId && styles.chipTextActive]}>None</Text>
          </TouchableOpacity>
          {workspaces.map((ws) => (
            <TouchableOpacity
              key={ws.id}
              style={[styles.chip, workspaceId === ws.id && styles.chipActive]}
              onPress={() => setWorkspaceId(ws.id)}
            >
              <View style={[styles.wsDot, { backgroundColor: ws.color ?? '#64748b' }]} />
              <Text style={[styles.chipText, workspaceId === ws.id && styles.chipTextActive]}>
                {ws.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={addProject.isPending}>
          {addProject.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Create Project</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#f8fafc' },
  cancel: { fontSize: 15, color: '#818cf8' },
  error: { color: '#f87171', marginBottom: 12, fontSize: 13 },
  label: { fontSize: 13, color: '#94a3b8', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: { borderColor: '#818cf8', backgroundColor: '#818cf822' },
  chipText: { fontSize: 13, color: '#94a3b8' },
  chipTextActive: { color: '#818cf8' },
  wsDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 40,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});

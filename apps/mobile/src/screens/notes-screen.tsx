// Global notes screen — shows all notes across projects with project filter

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useProjects, useNoteItems, useToggleNoteResolved, useDeleteNoteItem } from '@devdock/hooks';
import { NoteItemRow } from '../components/note-item-row';

export function NotesScreen() {
  const { data: projects = [], isLoading: loadingProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Use first project or selected project for note fetching
  const activeProjectId = selectedProjectId ?? projects[0]?.id ?? '';
  const { data: notes = [], isLoading: loadingNotes } = useNoteItems(activeProjectId, Boolean(activeProjectId));
  const toggleResolved = useToggleNoteResolved();
  const deleteNote = useDeleteNoteItem();

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  if (loadingProjects) {
    return <View style={styles.center}><ActivityIndicator color="#818cf8" size="large" /></View>;
  }

  if (projects.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No projects yet. Create one in the Projects tab.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Project filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {projects.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, activeProjectId === p.id && styles.chipActive]}
            onPress={() => setSelectedProjectId(p.id)}
          >
            <Text style={[styles.chipText, activeProjectId === p.id && styles.chipTextActive]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeProject && (
        <Text style={styles.sectionTitle}>{activeProject.name}</Text>
      )}

      {loadingNotes ? (
        <ActivityIndicator color="#818cf8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteItemRow
              note={item}
              onToggleResolved={() => toggleResolved.mutate(item.id)}
              onDelete={() => deleteNote.mutate({ id: item.id, projectId: activeProjectId })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No notes for this project.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  chips: { paddingHorizontal: 12, paddingVertical: 10, flexGrow: 0 },
  chip: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: '#334155' },
  chipActive: { borderColor: '#818cf8', backgroundColor: '#818cf822' },
  chipText: { fontSize: 13, color: '#94a3b8' },
  chipTextActive: { color: '#818cf8', fontWeight: '600' },
  sectionTitle: { fontSize: 13, color: '#64748b', paddingHorizontal: 16, paddingBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#475569', fontSize: 15, textAlign: 'center' },
});

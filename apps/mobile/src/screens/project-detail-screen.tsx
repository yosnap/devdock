// Project detail screen — tabbed view: Overview | Notes | Links

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Project } from '@devdock/types';
import {
  useNoteItems,
  useCreateNoteItem,
  useDeleteNoteItem,
  useToggleNoteResolved,
  useLinks,
  useUpsertLink,
  useDeleteLink,
  useUpdateProject,
} from '@devdock/hooks';
import { HealthScoreBadge } from '../components/health-score-badge';
import { NoteItemRow } from '../components/note-item-row';

type Tab = 'overview' | 'notes' | 'links';

const NOTE_TYPES = ['note', 'bug', 'idea', 'task', 'reminder'] as const;
type NoteType = typeof NOTE_TYPES[number];

interface Props {
  project: Project;
  workspaceName?: string;
}

export function ProjectDetailScreen({ project, workspaceName }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Notes
  const { data: notes = [], isLoading: loadingNotes } = useNoteItems(project.id);
  const createNote = useCreateNoteItem();
  const deleteNote = useDeleteNoteItem();
  const toggleResolved = useToggleNoteResolved();

  // Links
  const { data: links = [], isLoading: loadingLinks } = useLinks(project.id);
  const upsertLink = useUpsertLink();
  const deleteLink = useDeleteLink();

  // Favorite toggle
  const updateProject = useUpdateProject();

  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('note');
  const [showNoteForm, setShowNoteForm] = useState(false);

  // Link form state
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);

  async function handleAddNote() {
    if (!noteTitle.trim()) return;
    await createNote.mutateAsync({ project_id: project.id, title: noteTitle.trim(), note_type: noteType, content: '' });
    setNoteTitle('');
    setShowNoteForm(false);
  }

  async function handleAddLink() {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    await upsertLink.mutateAsync({ project_id: project.id, title: linkTitle.trim(), url: linkUrl.trim() });
    setLinkTitle('');
    setLinkUrl('');
    setShowLinkForm(false);
  }

  function handleDeleteLink(id: string) {
    Alert.alert('Delete link', 'Remove this link?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLink.mutate({ id, projectId: project.id }) },
    ]);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'notes', label: `Notes (${notes.length})` },
    { key: 'links', label: `Links (${links.length})` },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.projectHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.projectName} numberOfLines={2}>{project.name}</Text>
          <TouchableOpacity
            onPress={() => updateProject.mutate({ id: project.id, is_favorite: !project.is_favorite })}
            hitSlop={8}
          >
            <Ionicons
              name={project.is_favorite ? 'star' : 'star-outline'}
              size={22}
              color={project.is_favorite ? '#eab308' : '#64748b'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerMeta}>
          {project.stack && <Text style={styles.stack}>{project.stack}</Text>}
          {workspaceName && <Text style={styles.workspace}>{workspaceName}</Text>}
          {typeof project.health_score === 'number' && project.health_score >= 0 && (
            <HealthScoreBadge score={project.health_score} />
          )}
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentPadding}>
          {project.description ? (
            <Text style={styles.description}>{project.description}</Text>
          ) : (
            <Text style={styles.noData}>No description.</Text>
          )}
          {project.tags && project.tags.length > 0 && (
            <View style={styles.tagRow}>
              {project.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>{project.status ?? '—'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Health</Text>
              <Text style={styles.metaValue}>
                {project.health_score >= 0 ? project.health_score : 'Not scored'}
              </Text>
            </View>
            <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.metaLabel}>Updated</Text>
              <Text style={styles.metaValue}>
                {new Date(project.updated_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {activeTab === 'notes' && (
        <View style={styles.tabContent}>
          {showNoteForm && (
            <View style={styles.formBox}>
              <TextInput
                style={styles.input}
                placeholder="Note title"
                placeholderTextColor="#475569"
                value={noteTitle}
                onChangeText={setNoteTitle}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeChips}>
                {NOTE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, noteType === t && styles.typeChipActive]}
                    onPress={() => setNoteType(t)}
                  >
                    <Text style={[styles.typeChipText, noteType === t && styles.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.formActions}>
                <TouchableOpacity onPress={() => setShowNoteForm(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddNote} style={styles.addBtn} disabled={createNote.isPending}>
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {loadingNotes
            ? <ActivityIndicator color="#818cf8" style={{ marginTop: 40 }} />
            : (
              <FlatList
                data={notes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <NoteItemRow
                    note={item}
                    onToggleResolved={() => toggleResolved.mutate(item.id)}
                    onDelete={() => deleteNote.mutate({ id: item.id, projectId: project.id })}
                  />
                )}
                ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No notes yet.</Text></View>}
                ListFooterComponent={<View style={{ height: 80 }} />}
              />
            )
          }
          {!showNoteForm && (
            <TouchableOpacity style={styles.fab} onPress={() => setShowNoteForm(true)}>
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === 'links' && (
        <View style={styles.tabContent}>
          {showLinkForm && (
            <View style={styles.formBox}>
              <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#475569"
                value={linkTitle} onChangeText={setLinkTitle} />
              <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="https://..." placeholderTextColor="#475569"
                value={linkUrl} onChangeText={setLinkUrl} autoCapitalize="none" keyboardType="url" />
              <View style={styles.formActions}>
                <TouchableOpacity onPress={() => setShowLinkForm(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddLink} style={styles.addBtn} disabled={upsertLink.isPending}>
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {loadingLinks
            ? <ActivityIndicator color="#818cf8" style={{ marginTop: 40 }} />
            : (
              <FlatList
                data={links}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.linkRow}>
                    <TouchableOpacity style={styles.linkInfo} onPress={() => Linking.openURL(item.url)}>
                      <Text style={styles.linkTitle}>{item.title}</Text>
                      <Text style={styles.linkUrl} numberOfLines={1}>{item.url}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteLink(item.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color="#475569" />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No links yet.</Text></View>}
                ListFooterComponent={<View style={{ height: 80 }} />}
              />
            )
          }
          {!showLinkForm && (
            <TouchableOpacity style={styles.fab} onPress={() => setShowLinkForm(true)}>
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  projectHeader: { backgroundColor: '#1e293b', padding: 16, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  projectName: { fontSize: 20, fontWeight: '700', color: '#f8fafc', flex: 1, marginRight: 12 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  stack: { fontSize: 13, color: '#94a3b8', backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  workspace: { fontSize: 13, color: '#64748b' },
  tabBar: { flexDirection: 'row', backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#818cf8' },
  tabText: { fontSize: 13, color: '#64748b' },
  tabTextActive: { color: '#818cf8', fontWeight: '600' },
  tabContent: { flex: 1 },
  tabContentPadding: { padding: 16 },
  description: { fontSize: 15, color: '#cbd5e1', lineHeight: 22, marginBottom: 16 },
  noData: { color: '#475569', fontSize: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: '#94a3b8' },
  metaCard: { backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  metaLabel: { fontSize: 14, color: '#94a3b8' },
  metaValue: { fontSize: 14, color: '#f1f5f9' },
  formBox: { backgroundColor: '#1e293b', margin: 12, borderRadius: 12, padding: 14 },
  input: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  typeChips: { marginTop: 10, flexGrow: 0 },
  typeChip: { backgroundColor: '#0f172a', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8, borderWidth: 1, borderColor: '#334155' },
  typeChipActive: { borderColor: '#818cf8', backgroundColor: '#818cf822' },
  typeChipText: { fontSize: 12, color: '#94a3b8' },
  typeChipTextActive: { color: '#818cf8' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelBtnText: { color: '#64748b', fontSize: 14 },
  addBtn: { backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  linkInfo: { flex: 1, marginRight: 12 },
  linkTitle: { fontSize: 14, fontWeight: '500', color: '#818cf8' },
  linkUrl: { fontSize: 12, color: '#64748b', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#475569', fontSize: 15 },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 52, height: 52, borderRadius: 26, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', elevation: 6 },
});

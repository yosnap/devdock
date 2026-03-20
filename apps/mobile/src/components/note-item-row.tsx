// Single note row — shows type badge, title, resolved state, delete action

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NoteItem } from '@devdock/types';

interface Props {
  note: NoteItem;
  onToggleResolved: () => void;
  onDelete: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  bug: '#ef4444',
  idea: '#8b5cf6',
  task: '#3b82f6',
  reminder: '#f59e0b',
  note: '#64748b',
};

export function NoteItemRow({ note, onToggleResolved, onDelete }: Props) {
  const color = TYPE_COLORS[note.note_type] ?? '#64748b';
  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={onToggleResolved} style={styles.check}>
        <Ionicons
          name={note.is_resolved ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={note.is_resolved ? '#22c55e' : '#475569'}
        />
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={[styles.typeBadge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={[styles.typeText, { color }]}>{note.note_type}</Text>
          </View>
          <Text
            style={[styles.title, note.is_resolved && styles.resolved]}
            numberOfLines={1}
          >
            {note.title}
          </Text>
        </View>
        {note.content ? (
          <Text style={styles.body} numberOfLines={2}>{note.content}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color="#475569" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  check: { marginTop: 2 },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  typeBadge: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  typeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  title: { fontSize: 14, fontWeight: '500', color: '#f1f5f9', flex: 1 },
  resolved: { textDecorationLine: 'line-through', color: '#64748b' },
  body: { fontSize: 12, color: '#64748b', lineHeight: 18 },
});

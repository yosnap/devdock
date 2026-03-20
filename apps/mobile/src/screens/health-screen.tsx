// Health screen — projects needing attention, sorted worst-first

import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useProjectsNeedingAttention } from '@devdock/hooks';
import { HealthScoreBadge } from '../components/health-score-badge';

export function HealthScreen() {
  const router = useRouter();
  const { data: projects = [], isLoading, refetch, isRefetching } = useProjectsNeedingAttention();

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#818cf8" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push({ pathname: '/(app)/project/[id]', params: { id: item.id } })}
            activeOpacity={0.7}
          >
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.stack && <Text style={styles.stack}>{item.stack}</Text>}
            </View>
            <HealthScoreBadge score={item.health_score} />
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Needs attention</Text>
            <Text style={styles.headerSub}>Projects with health score below 80</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>All projects are healthy.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc' },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  info: { flex: 1, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '600', color: '#f8fafc' },
  stack: { fontSize: 12, color: '#64748b', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#475569', fontSize: 15 },
});

// Settings screen — user info, sign out, app version

import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';

export function SettingsScreen() {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await signOut();
          } catch {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  const email = session?.user?.email ?? '—';
  const userId = session?.user?.id ?? '—';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Account</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value} numberOfLines={1}>{email}</Text>
        </View>
        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.value} numberOfLines={1}>{userId.slice(0, 8)}…</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>0.2.0</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#ef4444" />
          : <Text style={styles.signOutText}>Sign out</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 20, marginLeft: 4 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 15, color: '#cbd5e1' },
  value: { fontSize: 14, color: '#64748b', maxWidth: '60%', textAlign: 'right' },
  signOutButton: { marginTop: 32, backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ef444433' },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
});

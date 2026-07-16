import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/lib/auth';
import { apiFetch } from '../../src/lib/api';
import Card from '../../src/components/Card';
import Loader from '../../src/components/Loader';
import EmptyState from '../../src/components/EmptyState';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function LinkedInScreen() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/api/student/linkedin-jobs', { token });
      setJobs(data?.jobs || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.h1}>LinkedIn Jobs</Text>
        <Text style={styles.h1Sub}>Browse opportunities posted on LinkedIn.</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            title="No LinkedIn jobs available"
            description="Check back later for new opportunities."
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => Linking.openURL(item.linkedin_url)}>
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="business-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.meta} numberOfLines={1}>{item.company_name}</Text>
                  </View>
                  {item.location ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.meta} numberOfLines={1}>{item.location}</Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons name="open-outline" size={18} color={colors.primary} />
              </View>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  h1Sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontSize: 12, color: colors.textMuted },
  desc: { fontSize: 12, color: colors.text, marginTop: spacing.sm, lineHeight: 18 },
  date: { fontSize: 11, color: colors.textSubtle, marginTop: spacing.sm },
});

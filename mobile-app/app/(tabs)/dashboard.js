import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { apiFetch } from '../../src/lib/api';
import Card from '../../src/components/Card';
import Loader from '../../src/components/Loader';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function DashboardScreen() {
  const { user, token, refresh } = useAuth();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/api/student/bids', { token });
      setBids(data?.bids || []);
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
    await Promise.all([refresh(), load()]);
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>Hi, {(user?.full_name || 'Student').split(' ')[0]}</Text>
          <Text style={styles.h1Sub}>Student Dashboard</Text>
        </View>

        {!user?.profile_completed && (
          <Card style={{ backgroundColor: colors.warningLight, borderColor: '#FDE68A' }}>
            <Text style={styles.warnTitle}>Complete your profile</Text>
            <Text style={styles.warnText}>
              Add your registration number, full name, department, and accept the data sharing consent to start bidding.
            </Text>
            <Link href="/(tabs)/profile" style={styles.warnLink}>Go to My Profile →</Link>
          </Card>
        )}

        <View style={styles.statsRow}>
          <StatCard
            icon="cash-outline"
            iconBg={colors.primaryLight}
            iconColor={colors.primary}
            label="Credits"
            value={user?.remaining_credits ?? 0}
          />
          <StatCard
            icon="document-text-outline"
            iconBg={colors.successLight}
            iconColor={colors.success}
            label="CV"
            value={user?.cv_url ? 'Uploaded' : 'None'}
            valueSize={14}
          />
          <StatCard
            icon="albums-outline"
            iconBg="#F3E8FF"
            iconColor="#7C3AED"
            label="Bids"
            value={bids.length}
          />
        </View>

        {bids.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Recent Bids</Text>
            {bids.slice(0, 6).map((bid) => (
              <View key={bid._id} style={styles.bidRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bidTitle} numberOfLines={1}>
                    {bid.job_id?.title || 'Unknown Position'}
                  </Text>
                  <Text style={styles.bidSub} numberOfLines={1}>
                    {bid.job_id?.company_id?.name || 'Unknown Company'} · {new Date(bid.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.bidCredits}>-{bid.credits_spent}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, iconBg, iconColor, label, value, valueSize = 22 }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { fontSize: valueSize }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  header: { marginBottom: spacing.sm },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  h1Sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  warnTitle: { fontWeight: '700', color: '#92400E', marginBottom: 4 },
  warnText: { fontSize: 13, color: '#78350F', marginBottom: 6 },
  warnLink: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statValue: { fontWeight: '800', color: colors.text },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bidTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  bidSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  bidCredits: { fontSize: 13, fontWeight: '700', color: colors.primary },
});

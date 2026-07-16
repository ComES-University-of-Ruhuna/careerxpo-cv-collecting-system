import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../src/lib/auth';
import { apiFetch } from '../../src/lib/api';
import Card from '../../src/components/Card';
import Loader from '../../src/components/Loader';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function CompaniesScreen() {
  const { user, token, updateUser } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [myBids, setMyBids] = useState({});
  const [uploadedCVs, setUploadedCVs] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(null); // job id currently uploading or bidding
  const [busyKind, setBusyKind] = useState(null); // 'upload' | 'bid'

  const load = useCallback(async () => {
    if (!token) return;
    if (!user?.profile_completed) {
      setCompanies([]);
      setMyBids({});
      return;
    }
    try {
      const deptParam = user?.department ? `?department=${user.department}` : '';
      const [compData, bidData] = await Promise.all([
        apiFetch(`/api/student/companies${deptParam}`, { token }),
        apiFetch('/api/student/bids', { token }),
      ]);
      setCompanies(compData?.companies || []);
      const map = {};
      (bidData?.bids || []).forEach((b) => {
        const jid = b.job_id?._id || b.job_id;
        map[jid] = { cv_url: b.cv_url, cv_drive_id: b.cv_drive_id };
      });
      setMyBids(map);
    } catch (err) {
      Alert.alert('Failed to load', err?.message || 'Please try again.');
    }
  }, [token, user?.profile_completed, user?.department]);

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

  async function uploadCV(jobId) {
    setBusy(jobId);
    setBusyKind('upload');
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose a PDF under 5MB.');
        return;
      }
      const fd = new FormData();
      fd.append('cv', {
        uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
        name: asset.name || 'resume.pdf',
        type: asset.mimeType || 'application/pdf',
      });
      fd.append('job_id', jobId);
      const data = await apiFetch('/api/student/upload', { token, method: 'POST', body: fd });
      if (myBids[jobId]) {
        setMyBids((prev) => ({
          ...prev,
          [jobId]: { cv_url: data.cv_url, cv_drive_id: data.cv_drive_id },
        }));
      } else {
        setUploadedCVs((prev) => ({
          ...prev,
          [jobId]: { cv_url: data.cv_url, cv_drive_id: data.cv_drive_id },
        }));
      }
      Alert.alert('Uploaded', 'Resume uploaded successfully.');
    } catch (err) {
      Alert.alert('Upload failed', err?.message || 'Please try again.');
    } finally {
      setBusy(null);
      setBusyKind(null);
    }
  }

  async function placeBid(jobId, creditCost) {
    if (myBids[jobId]) {
      Alert.alert('Already applied', 'You have already bid on this position.');
      return;
    }
    if ((user?.remaining_credits || 0) < creditCost) {
      Alert.alert('Insufficient credits', `You need ${creditCost} but have ${user?.remaining_credits || 0}.`);
      return;
    }
    const cvInfo = uploadedCVs[jobId];
    if (!cvInfo) {
      Alert.alert('Upload CV first', 'Please upload your CV for this position before bidding.');
      return;
    }
    setBusy(jobId);
    setBusyKind('bid');
    try {
      const data = await apiFetch('/api/student/bids', {
        token,
        method: 'POST',
        body: { job_id: jobId, cv_drive_id: cvInfo.cv_drive_id, cv_url: cvInfo.cv_url },
      });
      setMyBids((prev) => ({ ...prev, [jobId]: cvInfo }));
      setUploadedCVs((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
      updateUser({ remaining_credits: data.remaining_credits });
      Alert.alert('Bid placed', 'Your application has been submitted.');
    } catch (err) {
      Alert.alert('Bid failed', err?.message || 'Please try again.');
    } finally {
      setBusy(null);
      setBusyKind(null);
    }
  }

  const filtered = companies.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    if ((c.name || '').toLowerCase().includes(q)) return true;
    return (c.jobs || []).some((j) => (j.title || '').toLowerCase().includes(q));
  });

  if (loading) return <Loader />;

  if (!user?.profile_completed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, padding: spacing.lg }}>
          <Text style={styles.h1}>Companies</Text>
          <Card style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <Ionicons name="lock-closed-outline" size={28} color={colors.warning} />
            <Text style={styles.gateTitle}>Complete your profile to view job openings</Text>
            <Text style={styles.gateText}>
              Company job listings become available once you complete your profile.
            </Text>
            <Link href="/(tabs)/profile" asChild>
              <Button label="Go to My Profile" />
            </Link>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>Companies</Text>
          <View style={styles.chip}>
            <Ionicons name="cash-outline" size={13} color={colors.primary} />
            <Text style={styles.chipText}>{user?.remaining_credits ?? 0} credits</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={{ position: 'absolute', left: 12, top: 12 }} />
          <TextInput
            placeholder="Search companies or job titles..."
            value={query}
            onChangeText={setQuery}
            style={styles.search}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState title="No companies listed" description="Check back later once companies are added." />}
          renderItem={({ item: company }) => (
            <Card>
              <View style={styles.companyHead}>
                {company.logo ? (
                  <View style={styles.logoWrap}>
                    <Text style={{ color: '#fff' }}>{company.name?.[0] || '?'}</Text>
                  </View>
                ) : (
                  <View style={styles.logoWrap}>
                    <Text style={{ color: '#fff' }}>{company.name?.[0] || '?'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyName} numberOfLines={1}>{company.name}</Text>
                  {company.website ? (
                    <Pressable onPress={() => Linking.openURL(company.website)}>
                      <Text style={styles.link}>Website ↗</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {company.jobs?.length ? (
                company.jobs.map((job) => {
                  const bidInfo = myBids[job._id];
                  const hasBid = !!bidInfo;
                  const cvUploaded = !!uploadedCVs[job._id];
                  const isFull = job.max_applicants && job.current_applicants >= job.max_applicants && !hasBid;
                  const isClosed = job.is_closed || (job.deadline && new Date(job.deadline) < new Date());
                  const isBusyRow = busy === job._id;
                  return (
                    <View key={job._id} style={[styles.jobBox, isClosed && !hasBid && { opacity: 0.6 }]}>
                      <View style={styles.jobTitleRow}>
                        <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                        {isClosed && (
                          <View style={styles.badgeClosed}>
                            <Text style={styles.badgeClosedText}>Closed</Text>
                          </View>
                        )}
                      </View>
                      {job.deadline && !isClosed && (
                        <Text style={styles.jobMeta}>Deadline: {new Date(job.deadline).toLocaleString()}</Text>
                      )}
                      {job.max_applicants && !isClosed && (
                        <Text style={[styles.jobMeta, isFull && { color: colors.danger, fontWeight: '600' }]}>
                          {isFull ? 'All slots filled' : `${job.current_applicants || 0} / ${job.max_applicants} slots filled`}
                        </Text>
                      )}

                      {job.description ? (
                        <Text style={styles.jobDesc} numberOfLines={3}>{job.description}</Text>
                      ) : null}

                      <View style={styles.jobFooter}>
                        <Text style={styles.jobCredits}>{job.credit_cost} credits</Text>
                        {hasBid ? (
                          <View style={styles.pillApplied}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                            <Text style={styles.pillAppliedText}>Applied</Text>
                          </View>
                        ) : isClosed || isFull ? (
                          <View style={styles.pillDisabled}>
                            <Text style={styles.pillDisabledText}>{isClosed ? 'Closed' : 'Full'}</Text>
                          </View>
                        ) : cvUploaded ? (
                          <Button
                            label={isBusyRow && busyKind === 'bid' ? 'Bidding…' : 'Bid / Apply'}
                            onPress={() => placeBid(job._id, job.credit_cost)}
                            loading={isBusyRow && busyKind === 'bid'}
                            disabled={isBusyRow}
                            size="sm"
                          />
                        ) : (
                          <Button
                            label={isBusyRow && busyKind === 'upload' ? 'Uploading…' : 'Upload CV'}
                            onPress={() => uploadCV(job._id)}
                            loading={isBusyRow && busyKind === 'upload'}
                            disabled={isBusyRow}
                            size="sm"
                            icon={<Ionicons name="cloud-upload-outline" size={14} color="#fff" />}
                          />
                        )}
                      </View>

                      {(cvUploaded || (hasBid && bidInfo?.cv_url)) && (
                        <View style={styles.cvRow}>
                          <Ionicons name="document-text-outline" size={14} color={colors.success} />
                          <Pressable onPress={() => Linking.openURL((uploadedCVs[job._id] || bidInfo)?.cv_url)}>
                            <Text style={styles.cvLink}>Resume uploaded — View</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noJobs}>No open positions listed.</Text>
              )}
            </Card>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  chipText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  searchWrap: {
    position: 'relative',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: 36,
    paddingRight: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  companyHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: { fontSize: 15, fontWeight: '700', color: colors.text },
  link: { fontSize: 12, color: colors.primary, marginTop: 2 },
  jobBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 4,
  },
  jobTitleRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  jobTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  badgeClosed: { backgroundColor: colors.dangerLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeClosedText: { color: colors.danger, fontSize: 10, fontWeight: '700' },
  jobMeta: { fontSize: 11, color: colors.textMuted },
  jobDesc: { fontSize: 12, color: colors.text, marginTop: 6, lineHeight: 18 },
  jobFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: 8,
    flexWrap: 'wrap',
  },
  jobCredits: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  pillApplied: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  pillAppliedText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  pillDisabled: {
    backgroundColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  pillDisabledText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  cvRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  cvLink: { color: colors.success, fontSize: 12, fontWeight: '600' },
  noJobs: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  gateTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 8 },
  gateText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginVertical: 8 },
});

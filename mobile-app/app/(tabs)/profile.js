import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../src/lib/auth';
import { apiFetch } from '../../src/lib/api';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import StatusBadge from '../../src/components/StatusBadge';
import PaymentSlipModal from '../../src/components/PaymentSlipModal';
import { DEPARTMENTS, getSubSpecializations } from '../../src/lib/departments';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function ProfileScreen() {
  const { user, token, updateUser, signOut, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [slipVisible, setSlipVisible] = useState(false);
  const [paymentUploadsEnabled, setPaymentUploadsEnabled] = useState(true);

  const [form, setForm] = useState({
    registration_no: '',
    full_name: '',
    linkedin: '',
    department: '',
    sub_specialization: [],
    cv_consent: false,
  });

  const subSpecializations = useMemo(() => getSubSpecializations(form.department), [form.department]);
  const requiresSubSpecialization = subSpecializations.length > 0;

  useEffect(() => {
    if (!user) return;
    setForm({
      registration_no: user.registration_no || '',
      full_name: user.full_name || '',
      linkedin: user.linkedin || '',
      department: user.department || '',
      sub_specialization: Array.isArray(user.sub_specialization) ? user.sub_specialization : [],
      cv_consent: !!user.cv_consent,
    });
  }, [user]);

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/settings', { token })
      .then((data) => {
        if (data && typeof data.payment_slip_enabled === 'boolean') {
          setPaymentUploadsEnabled(data.payment_slip_enabled);
        }
      })
      .catch(() => {});
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  function toggleSub(value) {
    setForm((prev) => {
      const set = new Set(prev.sub_specialization);
      if (set.has(value)) set.delete(value); else set.add(value);
      return { ...prev, sub_specialization: Array.from(set) };
    });
  }

  function formatRegNo(raw) {
    const digits = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits.slice(0, 2) + '/' + digits.slice(2, 6) + '/' + digits.slice(6, 10);
  }

  async function saveProfile() {
    if (saving) return;
    if (!form.cv_consent) {
      Alert.alert('Consent required', 'Please accept the data sharing consent to save your profile.');
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch('/api/student/profile', {
        method: 'PUT',
        token,
        body: form,
      });
      updateUser(data.user);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Save failed', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadCV() {
    if (uploading) return;
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
      setUploading(true);
      const fd = new FormData();
      fd.append('cv', {
        uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
        name: asset.name || 'resume.pdf',
        type: asset.mimeType || 'application/pdf',
      });
      const data = await apiFetch('/api/student/upload', {
        method: 'POST',
        token,
        body: fd,
      });
      updateUser({ cv_url: data.cv_url, cv_drive_id: data.cv_drive_id });
      Alert.alert('Uploaded', 'Basic resume uploaded successfully.');
    } catch (err) {
      Alert.alert('Upload failed', err?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const slipStatus = user?.payment_slip_status || 'none';
  const slipUploaded = !!user?.payment_slip_url;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>My Profile</Text>
            {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          </View>
          <Pressable onPress={signOut} hitSlop={8} style={styles.signOut}>
            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        {!user?.profile_completed && (
          <Card style={{ backgroundColor: colors.warningLight, borderColor: '#FDE68A' }}>
            <Text style={{ color: '#92400E', fontWeight: '700' }}>Complete your profile</Text>
            <Text style={{ color: '#78350F', fontSize: 12, marginTop: 4 }}>
              Add your registration number, full name, department, and consent to unlock bidding.
            </Text>
          </Card>
        )}

        <Card>
          <Text style={styles.sectionTitle}>Profile Details</Text>

          <Field label="Registration Number *">
            <TextInput
              style={styles.input}
              value={form.registration_no}
              onChangeText={(v) => setForm({ ...form, registration_no: formatRegNo(v) })}
              placeholder="EG/2021/1234"
              autoCapitalize="characters"
              maxLength={12}
            />
            <Text style={styles.help}>Format: EG/20XX/XXXX</Text>
          </Field>

          <Field label="Full Name *">
            <TextInput
              style={styles.input}
              value={form.full_name}
              onChangeText={(v) => setForm({ ...form, full_name: v })}
              placeholder="Your full name"
            />
          </Field>

          <Field label="Department *">
            <View style={styles.selectRow}>
              {DEPARTMENTS.map((d) => {
                const active = form.department === d.value;
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => setForm({ ...form, department: d.value, sub_specialization: [] })}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{d.value}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {requiresSubSpecialization && (
            <Field label="Sub-specializations *">
              <View style={{ gap: 6 }}>
                {subSpecializations.map((s) => {
                  const checked = form.sub_specialization.includes(s);
                  return (
                    <Pressable
                      key={s}
                      onPress={() => toggleSub(s)}
                      style={[styles.checkRow, checked && styles.checkRowActive]}
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={checked ? colors.primary : colors.textMuted}
                      />
                      <Text style={styles.checkText}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          )}

          <Field label="LinkedIn URL">
            <TextInput
              style={styles.input}
              value={form.linkedin}
              onChangeText={(v) => setForm({ ...form, linkedin: v })}
              placeholder="https://linkedin.com/in/you"
              autoCapitalize="none"
              keyboardType="url"
            />
          </Field>

          <View style={styles.consentRow}>
            <Switch
              value={form.cv_consent}
              onValueChange={(v) => setForm({ ...form, cv_consent: v })}
              thumbColor={form.cv_consent ? colors.primary : '#fff'}
            />
            <Text style={styles.consentText}>
              I agree to share my CV and profile information with companies I bid on.
            </Text>
          </View>

          <Button
            label={saving ? 'Saving…' : 'Save Profile'}
            onPress={saveProfile}
            loading={saving}
            disabled={saving || !form.cv_consent || (requiresSubSpecialization && form.sub_specialization.length === 0)}
            fullWidth
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Basic Resume</Text>
          <Text style={styles.sectionText}>
            Upload a general resume (PDF, max 5MB). You can also upload company-specific resumes when bidding.
          </Text>
          {user?.cv_url ? (
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Pressable onPress={() => Linking.openURL(user.cv_url)}>
                <Text style={{ color: colors.success, fontWeight: '600' }}>Uploaded — View</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={{ color: colors.warning, fontSize: 12, marginBottom: spacing.sm }}>
              No basic resume uploaded yet.
            </Text>
          )}
          <Button
            label={uploading ? 'Uploading…' : user?.cv_url ? 'Re-upload Resume' : 'Upload Resume (PDF)'}
            onPress={uploadCV}
            loading={uploading}
            disabled={uploading}
            icon={<Ionicons name="cloud-upload-outline" size={16} color="#fff" />}
          />
        </Card>

        {(paymentUploadsEnabled || slipUploaded) && (
          <Card>
            <Text style={styles.sectionTitle}>Registration Fee</Text>
            <Text style={styles.sectionText}>
              A one-time fee of LKR 500 is required. Deposit it and upload the slip
              {user?.registration_no ? ` — use ${user.registration_no} as the payment reference.` : '.'}
            </Text>

            <View style={styles.slipStatusRow}>
              <StatusBadge status={slipUploaded ? slipStatus : 'none'} label={slipUploaded ? slipStatus : 'Not submitted'} />
              {user?.payment_slip_uploaded_at && (
                <Text style={styles.slipDate}>
                  {new Date(user.payment_slip_uploaded_at).toLocaleString()}
                </Text>
              )}
            </View>

            <View style={styles.slipButtons}>
              <Button
                label={slipUploaded ? 'Re-submit Slip' : 'Submit Slip'}
                onPress={() => setSlipVisible(true)}
                disabled={!user?.registration_no || !paymentUploadsEnabled}
                icon={<Ionicons name="cash-outline" size={16} color="#fff" />}
              />
              {slipUploaded && (
                <Pressable onPress={() => Linking.openURL(user.payment_slip_url)}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>View submitted slip →</Text>
                </Pressable>
              )}
            </View>

            {!paymentUploadsEnabled && (
              <Text style={{ color: colors.warning, fontSize: 11, marginTop: spacing.sm }}>
                Payment slip uploads are currently closed. Your submitted slip stays on record.
              </Text>
            )}
            {!user?.registration_no && (
              <Text style={{ color: colors.warning, fontSize: 11, marginTop: spacing.sm }}>
                Add your registration number above and save your profile first.
              </Text>
            )}
          </Card>
        )}
      </ScrollView>

      <PaymentSlipModal
        visible={slipVisible}
        onClose={() => setSlipVisible(false)}
        token={token}
        user={user}
        onSuccess={(data) =>
          updateUser({
            payment_slip_url: data.payment_slip_url,
            payment_slip_drive_id: data.payment_slip_drive_id,
            payment_slip_uploaded_at: data.payment_slip_uploaded_at,
            payment_slip_status: data.payment_slip_status,
            payment_details: data.payment_details,
          })
        }
      />
    </SafeAreaView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  signOutText: { color: colors.danger, fontWeight: '600', fontSize: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  sectionText: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
  },
  help: { fontSize: 11, color: colors.textSubtle, marginTop: 4 },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  checkText: { fontSize: 13, color: colors.text },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: spacing.md,
  },
  consentText: { flex: 1, color: colors.text, fontSize: 12 },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  slipStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  slipDate: { fontSize: 11, color: colors.textMuted },
  slipButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
});

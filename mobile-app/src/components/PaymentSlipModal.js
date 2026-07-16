import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import Card from './Card';
import { colors, radius, spacing } from '../lib/theme';
import { BANK_DETAILS, REGISTRATION_FEE_LKR } from '../lib/constants';
import { apiFetch } from '../lib/api';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function PaymentSlipModal({ visible, onClose, token, user, onSuccess }) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(() => ({
    payer_name: user?.full_name || '',
    bank_name: '',
    branch: '',
    deposit_date: new Date().toISOString().slice(0, 10),
    slip_no: '',
    reference_no: user?.registration_no || '',
    notes: '',
  }));

  function reset() {
    setFile(null);
    setSubmitting(false);
    setForm({
      payer_name: user?.full_name || '',
      bank_name: '',
      branch: '',
      deposit_date: new Date().toISOString().slice(0, 10),
      slip_no: '',
      reference_no: user?.registration_no || '',
      notes: '',
    });
  }

  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_TYPES,
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;

      if (asset.size && asset.size > MAX_SIZE_BYTES) {
        Alert.alert('File too large', 'Please pick a file under 5MB.');
        return;
      }
      if (asset.mimeType && !ACCEPTED_TYPES.includes(asset.mimeType)) {
        Alert.alert('Unsupported file', 'Please pick a PDF or image (JPG, PNG, WEBP).');
        return;
      }
      setFile(asset);
    } catch (err) {
      Alert.alert('Could not open file picker', err?.message || 'Unknown error');
    }
  }

  async function handleSubmit() {
    if (!file) {
      Alert.alert('Attach a slip', 'Please attach your bank slip (PDF or image).');
      return;
    }
    if (!form.payer_name.trim() || !form.bank_name.trim() || !form.deposit_date) {
      Alert.alert('Missing fields', 'Payer name, depositor\u2019s bank, and deposit date are required.');
      return;
    }
    if (!user?.registration_no) {
      Alert.alert('Profile incomplete', 'Please add your registration number in your profile first.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('slip', {
        uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
        name: file.name || `slip.${(file.mimeType || 'application/octet-stream').split('/')[1] || 'bin'}`,
        type: file.mimeType || 'application/octet-stream',
      });
      fd.append('payer_name', form.payer_name.trim());
      fd.append('bank_name', form.bank_name.trim());
      fd.append('branch', form.branch.trim());
      fd.append('deposit_date', form.deposit_date);
      fd.append('slip_no', form.slip_no.trim());
      fd.append('reference_no', form.reference_no.trim());
      fd.append('amount', String(REGISTRATION_FEE_LKR));
      fd.append('notes', form.notes.trim());

      const data = await apiFetch('/api/student/payment-slip', {
        method: 'POST',
        token,
        body: fd,
      });
      onSuccess?.(data);
      reset();
      onClose?.();
      Alert.alert('Submitted', 'Your bank slip has been submitted for verification.');
    } catch (err) {
      Alert.alert('Submission failed', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Submit Registration Fee</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Card style={{ backgroundColor: colors.primaryLight, borderColor: '#C7D2FE' }}>
            <Text style={styles.blockTitle}>Registration Fee: LKR {REGISTRATION_FEE_LKR}.00</Text>
            <Text style={styles.blockText}>
              Deposit the fee to the account below and upload the bank slip. Use your registration number
              {user?.registration_no ? ` (${user.registration_no}) ` : ' '}
              as the payment reference on the slip.
            </Text>
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.blockTitle}>Bank Details</Text>
            <BankRow label="Bank" value={BANK_DETAILS.bankName} />
            <BankRow label="Branch" value={BANK_DETAILS.branch} />
            <BankRow label="Account Name" value={BANK_DETAILS.accountName} />
            <BankRow label="Account No." value={BANK_DETAILS.accountNumber} />
            <BankRow label="Reference" value={user?.registration_no || '\u2014'} />
          </Card>

          <View style={styles.formSection}>
            <Field label="Payer Name *">
              <TextInput
                style={styles.input}
                value={form.payer_name}
                onChangeText={(v) => setForm({ ...form, payer_name: v })}
              />
            </Field>
            <Field label="Depositor\u2019s Bank *">
              <TextInput
                style={styles.input}
                placeholder="e.g. Bank of Ceylon"
                value={form.bank_name}
                onChangeText={(v) => setForm({ ...form, bank_name: v })}
              />
            </Field>
            <Field label="Branch">
              <TextInput
                style={styles.input}
                value={form.branch}
                onChangeText={(v) => setForm({ ...form, branch: v })}
              />
            </Field>
            <Field label="Deposit Date (YYYY-MM-DD) *">
              <TextInput
                style={styles.input}
                value={form.deposit_date}
                onChangeText={(v) => setForm({ ...form, deposit_date: v })}
                placeholder="2026-01-01"
                autoCapitalize="none"
              />
            </Field>
            <Field label="Receipt Slip No.">
              <TextInput
                style={styles.input}
                value={form.slip_no}
                onChangeText={(v) => setForm({ ...form, slip_no: v })}
                placeholder="Printed on the bank receipt"
              />
            </Field>
            <Field label="Reference No.">
              <TextInput
                style={styles.input}
                value={form.reference_no}
                onChangeText={(v) => setForm({ ...form, reference_no: v })}
                placeholder="Usually your registration number"
              />
            </Field>
            <Field label="Amount (LKR)">
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={String(REGISTRATION_FEE_LKR)}
                editable={false}
              />
              <Text style={styles.help}>Fixed at LKR {REGISTRATION_FEE_LKR}.</Text>
            </Field>
            <Field label="Notes (optional)">
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                multiline
              />
            </Field>

            <Field label="Bank Slip (PDF or image) *">
              <Pressable onPress={pickFile} style={styles.filePicker}>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                <Text style={styles.filePickerText}>
                  {file ? file.name || 'File selected' : 'Choose file'}
                </Text>
              </Pressable>
              <Text style={styles.help}>PDF, JPG, PNG, or WEBP. Max 5MB.</Text>
            </Field>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Cancel" variant="outline" onPress={onClose} disabled={submitting} />
          <Button
            label={submitting ? 'Submitting…' : 'Submit Slip'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            fullWidth={false}
          />
        </View>
      </View>
    </Modal>
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

function BankRow({ label, value }) {
  return (
    <View style={styles.bankRow}>
      <Text style={styles.bankLabel}>{label}</Text>
      <Text style={styles.bankValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { padding: spacing.lg, paddingBottom: 40 },
  blockTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  blockText: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bankLabel: { fontSize: 13, color: colors.textMuted, width: 110 },
  bankValue: { fontSize: 13, color: colors.text, flex: 1, textAlign: 'right', fontWeight: '500' },
  formSection: { marginTop: spacing.md },
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
  inputDisabled: { backgroundColor: colors.bg, color: colors.textMuted },
  help: { fontSize: 11, color: colors.textSubtle, marginTop: 4 },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.surface,
  },
  filePickerText: { fontSize: 13, color: colors.text, flex: 1 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

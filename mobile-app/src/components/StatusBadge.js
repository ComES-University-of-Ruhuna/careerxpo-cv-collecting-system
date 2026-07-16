import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../lib/theme';

const PRESETS = {
  pending: { bg: colors.infoLight, fg: colors.info, label: 'Pending' },
  verified: { bg: colors.successLight, fg: colors.success, label: 'Verified' },
  rejected: { bg: colors.dangerLight, fg: colors.danger, label: 'Rejected' },
  none: { bg: colors.bg, fg: colors.textMuted, label: 'None' },
  open: { bg: colors.successLight, fg: colors.success, label: 'Open' },
  closed: { bg: colors.dangerLight, fg: colors.danger, label: 'Closed' },
  full: { bg: colors.warningLight, fg: colors.warning, label: 'Full' },
  applied: { bg: colors.successLight, fg: colors.success, label: 'Applied' },
};

export default function StatusBadge({ status, label, tone }) {
  const preset = PRESETS[status] || PRESETS.none;
  const bg = tone?.bg || preset.bg;
  const fg = tone?.fg || preset.fg;
  const text = label ?? preset.label;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

/**
 * Basic primary/secondary/outline button with a busy state.
 */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon = null,
  fullWidth = false,
  size = 'md',
}) {
  const isDisabled = disabled || loading;
  const styles = getStyles(variant, size, isDisabled, fullWidth);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.primary} />
        ) : (
          icon
        )}
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

function getStyles(variant, size, disabled, fullWidth) {
  const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 14 : 11;
  const paddingHorizontal = size === 'sm' ? 12 : size === 'lg' ? 22 : 16;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  const palette = {
    primary: {
      bg: colors.primary,
      color: '#fff',
      border: colors.primary,
    },
    secondary: {
      bg: colors.primaryLight,
      color: colors.primaryDark,
      border: colors.primaryLight,
    },
    outline: {
      bg: 'transparent',
      color: colors.text,
      border: colors.border,
    },
    danger: {
      bg: colors.dangerLight,
      color: colors.danger,
      border: '#FCA5A5',
    },
  }[variant] || {};

  return StyleSheet.create({
    base: {
      backgroundColor: palette.bg,
      borderColor: palette.border,
      borderWidth: variant === 'outline' ? 1 : 0,
      borderRadius: radius.md,
      paddingVertical,
      paddingHorizontal,
      opacity: disabled ? 0.5 : 1,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
    },
    pressed: { opacity: 0.85 },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    label: {
      color: palette.color,
      fontSize,
      fontWeight: '600',
    },
  });
}

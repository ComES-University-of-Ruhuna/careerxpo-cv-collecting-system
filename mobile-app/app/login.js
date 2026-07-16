import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/lib/auth';
import Button from '../src/components/Button';
import Loader from '../src/components/Loader';
import { colors, spacing } from '../src/lib/theme';

export default function LoginScreen() {
  const { loading, token, canSignIn, signInWithGoogle, signingIn } = useAuth();
  const [error, setError] = useState(null);

  if (loading) return <Loader />;
  if (token) return <Redirect href="/(tabs)/dashboard" />;

  async function onGoogle() {
    setError(null);
    const result = await signInWithGoogle();
    if (!result.success && result.error) {
      setError(result.error);
      Alert.alert('Sign-in failed', result.error);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="school" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>CareerXpo</Text>
          <Text style={styles.subtitle}>Faculty of Engineering, University of Ruhuna</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome</Text>
          <Text style={styles.cardText}>
            Sign in with your university Google account to continue.
          </Text>
          <Button
            label={signingIn ? 'Signing in…' : 'Sign in with Google'}
            onPress={onGoogle}
            loading={signingIn}
            disabled={!canSignIn || signingIn}
            fullWidth
            icon={<Ionicons name="logo-google" size={18} color="#fff" />}
          />
          {!canSignIn && (
            <Text style={styles.warn}>
              Configure Google OAuth client IDs in app.json before signing in.
            </Text>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Text style={styles.footer}>
          By signing in you agree to the Privacy Policy and Terms of Service.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    padding: spacing['2xl'],
    justifyContent: 'center',
    gap: spacing['2xl'],
  },
  hero: { alignItems: 'center', gap: spacing.sm },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  cardText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  warn: { fontSize: 12, color: colors.warning, textAlign: 'center' },
  error: { fontSize: 12, color: colors.danger, textAlign: 'center' },
  footer: { fontSize: 11, color: colors.textSubtle, textAlign: 'center' },
});

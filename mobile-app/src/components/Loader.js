import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../lib/theme';

export default function Loader({ size = 'large', style }) {
  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});

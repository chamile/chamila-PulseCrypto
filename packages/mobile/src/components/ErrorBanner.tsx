import { View, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';
import type { NetError } from '@/net/errors';

interface Props {
  error: NetError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ error, onRetry, onDismiss }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.textCol}>
        <Text variant="label" color={colors.warn}>
          {labelForKind(error.kind)}
        </Text>
        <Text variant="body" color={colors.text}>
          {error.message}
        </Text>
      </View>
      <View style={styles.actions}>
        {error.retryable && onRetry ? (
          <Pressable onPress={onRetry} style={styles.retry} hitSlop={8}>
            <Text variant="label" color={colors.primary}>
              RETRY
            </Text>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={8} style={styles.dismiss}>
            <Text variant="label" color={colors.textMuted}>
              ✕
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function labelForKind(kind: NetError['kind']) {
  switch (kind) {
    case 'network':
      return 'CONNECTION PROBLEM';
    case 'http':
      return 'SERVER ERROR';
    case 'parse':
      return 'BAD RESPONSE';
    default:
      return 'ERROR';
  }
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.downSoft,
    borderColor: colors.down,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  retry: {
    backgroundColor: colors.warn,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  dismiss: {
    padding: spacing.xxs,
  },
});

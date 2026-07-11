import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { usePairState } from '@/state/marketStores';
import { formatCompact, formatPrice } from '@/utils/format';

interface Props {
  pair: string;
}

export function StatsRow({ pair }: Props) {
  const high = usePairState(pair, (s) => s.tick?.high24h ?? 0);
  const low = usePairState(pair, (s) => s.tick?.low24h ?? 0);
  const vol = usePairState(pair, (s) => s.tick?.volume24h ?? 0);

  return (
    <View style={styles.row}>
      <Stat label="24H HIGH" value={high > 0 ? `$${formatPrice(high)}` : '—'} />
      <Stat label="24H LOW" value={low > 0 ? `$${formatPrice(low)}` : '—'} />
      <Stat label="24H VOLUME" value={vol > 0 ? formatCompact(vol) : '—'} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.col}>
      <Text variant="label" color={colors.textMuted}>
        {label}
      </Text>
      <Text variant="monoBold" color={colors.text}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  col: {
    gap: 2,
  },
});

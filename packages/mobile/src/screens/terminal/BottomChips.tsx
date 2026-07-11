import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { usePairState } from '@/state/marketStores';

interface Props {
  pair: string;
}

export function BottomChips({ pair }: Props) {
  const tick = usePairState(pair, (s) => s.tick);
  const spread = tick?.spread ?? 0;
  const price = tick?.price ?? 1;
  const spreadPct = price > 0 ? (spread / price) * 100 : 0;
  const buy = tick?.buyPressure ?? 50;

  const gapTone = spreadPct < 0.05 ? colors.up : spreadPct < 0.2 ? colors.warn : colors.down;
  const gapLabel = spreadPct < 0.05 ? 'Low' : spreadPct < 0.2 ? 'Med' : 'High';

  const pressureLabel =
    buy > 60 ? 'Buy Heavy' : buy < 40 ? 'Sell Heavy' : 'Balanced';
  const pressureTone =
    buy > 60 ? colors.up : buy < 40 ? colors.down : colors.textMuted;

  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <Text variant="labelSmall" color={colors.textMuted}>
          LIQUIDITY GAP
        </Text>
        <Text variant="bodySemi" color={gapTone}>
          {gapLabel} ({spreadPct.toFixed(2)}%)
        </Text>
      </View>
      <View style={styles.chip}>
        <Text variant="labelSmall" color={colors.textMuted}>
          PRESSURE
        </Text>
        <Text variant="bodySemi" color={pressureTone}>
          {pressureLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
});

import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { usePairState } from '@/state/marketStores';
import { usePriceFlash } from '@/hooks/usePriceFlash';
import { formatPct, formatPrice } from '@/utils/format';

interface Props {
  pair: string;
}

export function PriceHeader({ pair }: Props) {
  const price = usePairState(pair, (s) => s.tick?.price ?? 0);
  const change = usePairState(pair, (s) => s.tick?.change24hPct ?? 0);
  const flash = usePriceFlash(pair);
  const trendColor = change >= 0 ? colors.up : colors.down;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.overlay, flash.upStyle]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.overlay, flash.downStyle]}
        pointerEvents="none"
      />
      <Text variant="label" color={colors.textMuted}>
        LAST PRICE
      </Text>
      <View style={styles.priceRow}>
        <Text variant="display">
          {price > 0 ? `$${formatPrice(price)}` : '—'}
        </Text>
        <Text variant="bodySemi" color={trendColor}>
          {change >= 0 ? '▲' : '▼'} {formatPct(change)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    overflow: 'hidden',
    borderRadius: 10,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});

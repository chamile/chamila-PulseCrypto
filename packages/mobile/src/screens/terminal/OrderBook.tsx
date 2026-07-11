import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { Level } from '@pulsecrypto/contracts';
import { colors, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { usePairState } from '@/state/marketStores';
import { formatPrice, formatQty } from '@/utils/format';

interface Props {
  pair: string;
  levelsShown?: number;
}

export function OrderBook({ pair, levelsShown = 12 }: Props) {
  const bids = usePairState(pair, (s) => s.tick?.bids ?? []);
  const asks = usePairState(pair, (s) => s.tick?.asks ?? []);

  const bidRows = useMemo(
    () => bids.slice(0, levelsShown),
    [bids, levelsShown],
  );
  const askRows = useMemo(
    () => asks.slice(0, levelsShown).slice().reverse(),
    [asks, levelsShown],
  );

  const maxVol = useMemo(() => {
    let m = 0;
    let acc = 0;
    for (const l of bidRows) {
      acc += l.qty;
      if (acc > m) m = acc;
    }
    acc = 0;
    for (const l of askRows) {
      acc += l.qty;
      if (acc > m) m = acc;
    }
    return m || 1;
  }, [bidRows, askRows]);

  return (
    <View>
      <Header />
      <View style={{ marginBottom: spacing.sm }}>
        {computeCumulative(askRows, true).map(({ level, cum }) => (
          <BookRow
            key={`ask-${level.price}`}
            level={level}
            cum={cum}
            max={maxVol}
            side="ask"
          />
        ))}
      </View>
      <View style={styles.divider} />
      <View>
        {computeCumulative(bidRows, false).map(({ level, cum }) => (
          <BookRow
            key={`bid-${level.price}`}
            level={level}
            cum={cum}
            max={maxVol}
            side="bid"
          />
        ))}
      </View>
    </View>
  );
}

function computeCumulative(levels: Level[], reversedAcc: boolean) {
  const out: { level: Level; cum: number }[] = [];
  if (reversedAcc) {
    // asks displayed top-down but cumulative from best (bottom)
    let acc = 0;
    const rev = [...levels].reverse();
    const withCum: { level: Level; cum: number }[] = [];
    for (const l of rev) {
      acc += l.qty;
      withCum.push({ level: l, cum: acc });
    }
    return withCum.reverse();
  }
  let acc = 0;
  for (const l of levels) {
    acc += l.qty;
    out.push({ level: l, cum: acc });
  }
  return out;
}

function Header() {
  return (
    <View style={styles.header}>
      <Text variant="label" color={colors.textMuted} style={{ flex: 1 }}>
        PRICE (USDT)
      </Text>
      <Text
        variant="label"
        color={colors.textMuted}
        style={{ flex: 1, textAlign: 'right' }}
      >
        AMOUNT
      </Text>
      <Text
        variant="label"
        color={colors.textMuted}
        style={{ flex: 1, textAlign: 'right' }}
      >
        TOTAL
      </Text>
    </View>
  );
}

const BookRow = memo(function BookRow({
  level,
  cum,
  max,
  side,
}: {
  level: Level;
  cum: number;
  max: number;
  side: 'bid' | 'ask';
}) {
  const pct = Math.min(1, cum / max);
  const bg = side === 'bid' ? colors.upSoft : colors.downSoft;
  const priceColor = side === 'bid' ? colors.up : colors.down;

  return (
    <View style={styles.row}>
      <View
        style={[styles.depthBar, { width: `${pct * 100}%`, backgroundColor: bg }]}
      />
      <Text
        variant="mono"
        color={priceColor}
        style={{ flex: 1 }}
      >
        {formatPrice(level.price)}
      </Text>
      <Text
        variant="mono"
        color={colors.text}
        style={{ flex: 1, textAlign: 'right' }}
      >
        {formatQty(level.qty)}
      </Text>
      <Text
        variant="mono"
        color={colors.textMuted}
        style={{ flex: 1, textAlign: 'right' }}
      >
        {formatQty(cum, 2)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  depthBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.9,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});

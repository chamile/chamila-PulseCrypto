import { View, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { usePairState } from '@/state/marketStores';
import { formatCompact } from '@/utils/format';

interface Props {
  pair: string;
  width: number;
  height?: number;
}

export function DepthChart({ pair, width, height = 120 }: Props) {
  const bids = usePairState(pair, (s) => s.tick?.bids ?? []);
  const asks = usePairState(pair, (s) => s.tick?.asks ?? []);

  const halfW = width / 2;

  const bidsAcc = accumulate(bids);
  const asksAcc = accumulate(asks);
  const bidTotal = bidsAcc.at(-1)?.cum ?? 0;
  const askTotal = asksAcc.at(-1)?.cum ?? 0;
  const maxCum = Math.max(bidTotal, askTotal, 1);

  const bidPath = buildPath(bidsAcc, halfW, height, maxCum, 'left');
  const askPath = buildPath(asksAcc, halfW, height, maxCum, 'right');

  return (
    <View>
      <View style={styles.header}>
        <Text variant="label" color={colors.textMuted}>
          MARKET DEPTH
        </Text>
        <View style={styles.legend}>
          <LegendDot color={colors.up} label={`Bids ${formatCompact(bidTotal)}`} />
          <LegendDot color={colors.down} label={`Asks ${formatCompact(askTotal)}`} />
        </View>
      </View>
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          {bidPath ? <Path d={bidPath} fill={colors.up} fillOpacity={0.35} /> : null}
          {askPath ? <Path d={askPath} fill={colors.down} fillOpacity={0.35} /> : null}
          <Line
            x1={halfW}
            y1={0}
            x2={halfW}
            y2={height}
            stroke={colors.border}
            strokeWidth={1}
          />
        </Svg>
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="label" color={colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

function accumulate(levels: { price: number; qty: number }[]) {
  const out: { price: number; cum: number }[] = [];
  let acc = 0;
  for (const l of levels) {
    acc += l.qty;
    out.push({ price: l.price, cum: acc });
  }
  return out;
}

function buildPath(
  data: { price: number; cum: number }[],
  width: number,
  height: number,
  maxCum: number,
  side: 'left' | 'right',
): string {
  if (data.length === 0) return '';
  const steps = data.length;
  const dx = width / Math.max(steps, 1);
  const baseX = side === 'left' ? width : 0;
  const dir = side === 'left' ? -1 : 1;

  const points: string[] = [];
  points.push(`M ${baseX} ${height}`);
  for (let i = 0; i < data.length; i++) {
    const x = baseX + dir * dx * (i + 1);
    const y = height - (data[i]!.cum / maxCum) * height;
    points.push(`L ${x} ${y}`);
  }
  const endX = baseX + dir * width;
  points.push(`L ${endX} ${height}`);
  points.push('Z');
  return points.join(' ');
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

import { ScrollView, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { PriceHeader } from '@/screens/terminal/PriceHeader';
import { StatsRow } from '@/screens/terminal/StatsRow';
import { OrderBook } from '@/screens/terminal/OrderBook';
import { DepthChart } from '@/screens/terminal/DepthChart';
import { BottomChips } from '@/screens/terminal/BottomChips';
import { useSelectedPair } from '@/state/selectedPairStore';
import { usePairState } from '@/state/marketStores';
import { useConnectionStore } from '@/state/connectionStore';
import { formatTime, pairDisplay } from '@/utils/format';

export default function TerminalScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pair = useSelectedPair((s) => s.pair);
  const updatedAt = usePairState(pair, (s) => s.tick?.ts ?? null);
  const showOffline = useConnectionStore((s) => s.showOffline);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <View>
          <Text variant="label" color={colors.textMuted}>
            SELECTED PAIR
          </Text>
          <Text variant="headlineBold">{pairDisplay(pair)}</Text>
        </View>
        <ConnectionIndicator />
      </View>

      {showOffline ? (
        <View style={styles.staleBanner}>
          <Text variant="label" color={colors.warn}>
            SHOWING STALE DATA · {formatTime(updatedAt)}
          </Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        <View style={styles.card}>
          <PriceHeader pair={pair} />
          <StatsRow pair={pair} />
          <OrderBook pair={pair} />
        </View>

        <View style={styles.card}>
          <DepthChart
            pair={pair}
            width={width - spacing.lg * 2 - spacing.lg * 2}
          />
        </View>

        <BottomChips pair={pair} />

        <Text
          variant="label"
          color={colors.textDim}
          style={{ textAlign: 'center', marginTop: spacing.md }}
        >
          LAST UPDATED · {formatTime(updatedAt)}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  staleBanner: {
    backgroundColor: '#F5B93C22',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

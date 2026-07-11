import { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { StarIcon } from '@/components/StarIcon';
import { usePairState } from '@/state/marketStores';
import { useMetaStore } from '@/state/metaStore';
import { useFavoritesStore } from '@/state/favoritesStore';
import { useSelectedPair } from '@/state/selectedPairStore';
import { usePriceFlash } from '@/hooks/usePriceFlash';
import { formatPrice, formatPct, pairDisplay } from '@/utils/format';

interface Props {
  pair: string;
}

function WatchlistRowInner({ pair }: Props) {
  const router = useRouter();
  const price = usePairState(pair, (s) => s.tick?.price ?? 0);
  const change = usePairState(pair, (s) => s.tick?.change24hPct ?? 0);
  const flash = usePriceFlash(pair);
  const displayName = useMetaStore((s) => s.byPair[pair]?.displayName ?? pair);
  const isFav = useFavoritesStore((s) => s.favorites.includes(pair));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const selectPair = useSelectedPair((s) => s.select);

  const trendColor = change >= 0 ? colors.up : colors.down;
  const trendArrow = change >= 0 ? '▲' : '▼';

  const onPress = () => {
    selectPair(pair);
    router.push('/(tabs)/terminal');
  };

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <View style={styles.row}>
        <Animated.View
          style={[styles.overlay, flash.upStyle]}
          pointerEvents="none"
        />
        <Animated.View
          style={[styles.overlay, flash.downStyle]}
          pointerEvents="none"
        />
        <Pressable
          onPress={() => toggleFav(pair)}
          hitSlop={12}
          style={styles.star}
        >
          <StarIcon active={isFav} />
        </Pressable>
        <View style={styles.info}>
          <Text variant="bodySemi">{pairDisplay(pair)}</Text>
          <Text variant="label" color={colors.textMuted}>
            {displayName}
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="monoBold" size={15}>
            {price > 0 ? `$${formatPrice(price)}` : '—'}
          </Text>
          <Text variant="label" color={trendColor}>
            {trendArrow} {formatPct(change)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const WatchlistRow = memo(WatchlistRowInner);

const styles = StyleSheet.create({
  pressable: {
    marginBottom: spacing.sm,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  star: {
    padding: spacing.xxs,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

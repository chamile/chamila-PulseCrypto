import { useMemo, useState } from 'react';
import { View, RefreshControl, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUPPORTED_PAIRS } from '@pulsecrypto/contracts';
import { colors, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { SearchBar } from '@/screens/markets/SearchBar';
import { WatchlistRow } from '@/screens/markets/WatchlistRow';
import { ErrorBanner } from '@/components/ErrorBanner';
import { useMetaStore } from '@/state/metaStore';
import { useFavoritesStore } from '@/state/favoritesStore';

export default function MarketsScreen() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const refresh = useMetaStore((s) => s.refresh);
  const loading = useMetaStore((s) => s.loading);
  const error = useMetaStore((s) => s.error);
  const clearError = useMetaStore((s) => s.clearError);
  const favorites = useFavoritesStore((s) => s.favorites);

  const { favs, others } = useMemo(() => {
    const query = q.trim().toUpperCase();
    const filtered = SUPPORTED_PAIRS.filter((p) => !query || p.includes(query));
    const favSet = new Set(favorites);
    return {
      favs: filtered.filter((p) => favSet.has(p)),
      others: filtered.filter((p) => !favSet.has(p)),
    };
  }, [q, favorites]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <View>
          <Text variant="label" color={colors.textMuted}>
            PULSECRYPTO
          </Text>
          <Text variant="headlineBold">Market Watchlist</Text>
        </View>
        <ConnectionIndicator />
      </View>

      <SearchBar value={q} onChange={setQ} />

      {error ? (
        <ErrorBanner error={error} onRetry={refresh} onDismiss={clearError} />
      ) : null}

      <Text variant="label" color={colors.textMuted} style={styles.changeHeader}>
        PRICE / 24H CHANGE
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.up}
          />
        }
      >
        {favs.length > 0 ? (
          <>
            <Text variant="label" color={colors.textMuted} style={styles.sectionLabel}>
              FAVOURITES
            </Text>
            {favs.map((p) => (
              <WatchlistRow key={p} pair={p} />
            ))}
          </>
        ) : null}

        {others.length > 0 ? (
          <>
            <Text
              variant="label"
              color={colors.textMuted}
              style={styles.sectionLabel}
            >
              ALL PAIRS
            </Text>
            {others.map((p) => (
              <WatchlistRow key={p} pair={p} />
            ))}
          </>
        ) : null}

        {favs.length === 0 && others.length === 0 ? (
          <Text
            variant="body"
            color={colors.textMuted}
            style={{ textAlign: 'center', marginTop: spacing.xl }}
          >
            No pairs match &quot;{q}&quot;
          </Text>
        ) : null}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  changeHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'right',
    paddingRight: spacing.lg,
  },
});

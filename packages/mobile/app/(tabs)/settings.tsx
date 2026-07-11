import { useState } from 'react';
import { ScrollView, View, StyleSheet, Switch, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { wsClient } from '@/net/wsClient';

const MIN_INTERVAL_MS = 10;
const DEFAULT_INTERVAL_MS = 100;
const PRESETS = [10, 50, 100, 250, 500, 1000];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS);

  const apply = (ms: number) => {
    setIntervalMs(ms);
    wsClient.sendInterval(ms);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
      }}
    >
      <View style={styles.header}>
        <View>
          <Text variant="label" color={colors.textMuted}>
            SYSTEM
          </Text>
          <Text variant="headlineBold">Settings</Text>
        </View>
        <ConnectionIndicator />
      </View>

      <Text
        variant="body"
        color={colors.textMuted}
        style={{ marginBottom: spacing.lg }}
      >
        Backpressure configuration and ingestion controls.
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text variant="label" color={colors.textMuted}>
            NETWORK CONTROL
          </Text>
          <Text variant="monoBold" color={colors.up}>
            {intervalMs}ms
          </Text>
        </View>
        <Text variant="headline" style={{ marginBottom: spacing.xs }}>
          Data Throttling
        </Text>
        <Text
          variant="body"
          color={colors.textMuted}
          style={{ marginBottom: spacing.md }}
        >
          Controls how often the server emits coalesced snapshots to this client.
        </Text>

        <Slider
          minimumValue={MIN_INTERVAL_MS}
          maximumValue={1000}
          step={10}
          value={intervalMs}
          onSlidingComplete={apply}
          minimumTrackTintColor={colors.up}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.up}
        />

        <View style={styles.rangeRow}>
          <Text variant="labelSmall" color={colors.textDim}>
            {MIN_INTERVAL_MS}ms
          </Text>
          <Text variant="labelSmall" color={colors.textDim}>
            500ms
          </Text>
          <Text variant="labelSmall" color={colors.textDim}>
            1000ms
          </Text>
        </View>

        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => apply(p)}
              style={[
                styles.preset,
                intervalMs === p && { borderColor: colors.up },
              ]}
            >
              <Text
                variant="labelSmall"
                color={intervalMs === p ? colors.up : colors.textMuted}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View
        style={[styles.card, styles.cardDisabled]}
        pointerEvents="none"
      >
        <Text variant="label" color={colors.textMuted}>
          UNAVAILABLE
        </Text>
        <View style={{ height: spacing.xs }} />
        <Toggle
          label="Binary Protocol Compression"
          hint="Not implemented in this build"
          value={false}
          disabled
        />
        <View style={styles.divider} />
        <Toggle
          label="Adaptive Polling Strategy"
          hint="Not implemented in this build"
          value={false}
          disabled
        />
      </View>

      <View style={styles.card}>
        <Text variant="label" color={colors.textMuted}>
          NOTES
        </Text>
        <Text
          variant="body"
          color={colors.textMuted}
          style={{ marginTop: spacing.xs }}
        >
          The slider sends a `setInterval` message over the WebSocket to
          reconfigure this client&apos;s emit cadence. The backend keeps a
          bounded per-client send buffer; if this client falls behind, ticks are
          dropped (never queued) and the connection is closed after sustained
          backpressure.
        </Text>
      </View>
    </ScrollView>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text variant="bodySemi">{label}</Text>
        <Text variant="labelSmall" color={colors.textMuted}>
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.up, false: colors.border }}
        thumbColor={colors.text}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  preset: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});

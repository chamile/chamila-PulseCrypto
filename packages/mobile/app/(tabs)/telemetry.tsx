import { ScrollView, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import { Text } from '@/components/Text';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { Pill } from '@/components/Pill';
import { CircularGauge } from '@/screens/telemetry/CircularGauge';
import { Sparkline } from '@/screens/telemetry/Sparkline';
import { useHealthPoll } from '@/hooks/useHealthPoll';
import { useFps } from '@/hooks/useFps';

export default function TelemetryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fps = useFps();
  const { data, history } = useHealthPoll(1000);

  const healthTone =
    data?.upstream === 'up' ? 'up' : data?.upstream === 'down' ? 'down' : 'warn';
  const healthLabel = data?.upstream === 'up' ? 'HEALTHY' : 'DEGRADED';

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
          <Text variant="headlineBold">Telemetry</Text>
        </View>
        <ConnectionIndicator />
      </View>

      <Text
        variant="body"
        color={colors.textMuted}
        style={{ marginBottom: spacing.lg }}
      >
        Real-time performance monitoring and backpressure metrics.
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View>
            <Text variant="label" color={colors.textMuted}>
              SYSTEM TELEMETRY
            </Text>
            <Text variant="headline">Performance</Text>
          </View>
          <Pill label={healthLabel} tone={healthTone} />
        </View>

        <View style={styles.gaugeRow}>
          <CircularGauge value={fps} max={60} label="JS FRAME RATE" />
          <CircularGauge
            value={data?.msgsPerSec ?? 0}
            max={100}
            label="MSGS / SEC"
            color={colors.warn}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text variant="label" color={colors.textMuted}>
          BACKEND MEMORY FOOTPRINT
        </Text>
        <Text variant="headline" style={{ marginBottom: spacing.md }}>
          {data ? `${data.memoryMb.toFixed(1)} MB` : '—'}
        </Text>
        <Sparkline
          values={history}
          width={width - spacing.lg * 2 - spacing.lg * 2}
          height={80}
        />
      </View>

      <View style={styles.card}>
        <Row
          label="UPSTREAM (BINANCE)"
          value={data?.upstream.toUpperCase() ?? '—'}
          tone={healthTone}
        />
        <Row
          label="ACTIVE CLIENTS"
          value={data ? String(data.clients) : '—'}
        />
        <Row
          label="EMIT INTERVAL"
          value={data ? `${data.emitIntervalMs} ms` : '—'}
          tag="SERVER"
        />
        <Row
          label="AVG BUFFERED BYTES"
          value={data ? `${data.avgBufferedBytes.toLocaleString()} B` : '—'}
          tag="SERVER"
        />
        <Row
          label="DROPPED TICKS"
          value={data ? String(data.drops) : '—'}
          tag="SERVER"
        />
        <Row
          label="UPTIME"
          value={data ? formatUptime(data.uptimeSec) : '—'}
          tag="SERVER"
          last
        />
      </View>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  tone,
  tag,
  last,
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'warn';
  tag?: string;
  last?: boolean;
}) {
  const color =
    tone === 'up' ? colors.up : tone === 'down' ? colors.down : colors.text;
  return (
    <View style={[styles.statRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.labelCol}>
        <Text variant="label" color={colors.textMuted}>
          {label}
        </Text>
        {tag ? (
          <View style={styles.rowTag}>
            <Text variant="labelSmall" color={colors.info} size={9}>
              {tag}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="monoBold" color={color}>
        {value}
      </Text>
    </View>
  );
}

function formatUptime(s: number): string {
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
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
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  labelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  rowTag: {
    backgroundColor: colors.infoSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
});

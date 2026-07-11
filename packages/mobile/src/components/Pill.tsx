import { View, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

type Tone = 'up' | 'down' | 'neutral' | 'warn';

interface Props {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  up: { bg: colors.upSoft, fg: colors.up },
  down: { bg: colors.downSoft, fg: colors.down },
  neutral: { bg: colors.surfaceElevated, fg: colors.textMuted },
  warn: { bg: colors.warnSoft, fg: colors.warn },
};

export function Pill({ label, tone = 'neutral', style }: Props) {
  const t = toneMap[tone];
  return (
    <View
      style={[
        {
          backgroundColor: t.bg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs + 2,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text variant="label" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}

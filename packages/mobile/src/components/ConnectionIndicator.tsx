import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, spacing } from '@/theme';
import { Text } from './Text';
import { useConnectionStore } from '@/state/connectionStore';

export function ConnectionIndicator() {
  const wsState = useConnectionStore((s) => s.wsState);
  const showOffline = useConnectionStore((s) => s.showOffline);

  const isOpen = wsState === 'open';
  const label = isOpen
    ? 'CONNECTED'
    : showOffline
      ? wsState === 'offline'
        ? 'OFFLINE'
        : 'RECONNECTING'
      : 'CONNECTING';
  const color = isOpen
    ? colors.up
    : showOffline
      ? colors.down
      : colors.warn;

  const pulse = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(pulse);
    if (isOpen) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [isOpen, pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Animated.View
        style={[
          {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
          },
          dotStyle,
        ]}
      />
      <Text variant="label" color={color}>
        {label}
      </Text>
    </View>
  );
}

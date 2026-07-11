import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { usePairState } from '@/state/marketStores';
import { colors } from '@/theme';

const FLASH_DURATION_MS = 500;
const FLASH_PEAK_OPACITY = 0.35;

export function usePriceFlash(pair: string) {
  const price = usePairState(pair, (s) => s.tick?.price ?? 0);
  const lastFlash = usePairState(pair, (s) => s.lastFlash);

  const upFlash = useSharedValue(0);
  const downFlash = useSharedValue(0);

  useEffect(() => {
    if (price === 0) return;
    if (lastFlash === 'up') {
      upFlash.value = FLASH_PEAK_OPACITY;
      upFlash.value = withTiming(0, {
        duration: FLASH_DURATION_MS,
        easing: Easing.out(Easing.quad),
      });
    } else if (lastFlash === 'down') {
      downFlash.value = FLASH_PEAK_OPACITY;
      downFlash.value = withTiming(0, {
        duration: FLASH_DURATION_MS,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [price, lastFlash, upFlash, downFlash]);

  const upStyle = useAnimatedStyle(() => ({
    backgroundColor: colors.up,
    opacity: upFlash.value,
  }));

  const downStyle = useAnimatedStyle(() => ({
    backgroundColor: colors.down,
    opacity: downFlash.value,
  }));

  return { upStyle, downStyle };
}

import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';

interface Props {
  active: boolean;
  size?: number;
}

export function StarIcon({ active, size = 20 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.4 6.6L12 17.6 5.9 20.7l1.4-6.6L2.5 9.5l6.6-.8z"
        stroke={active ? colors.warn : colors.textDim}
        fill={active ? colors.warn : 'transparent'}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

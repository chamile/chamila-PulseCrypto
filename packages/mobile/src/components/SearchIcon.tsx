import Svg, { Circle, Path } from 'react-native-svg';

interface Props {
  color: string;
  size?: number;
}

export function SearchIcon({ color, size = 16 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={1.8} />
      <Path
        d="M20 20l-3.5-3.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  name: 'terminal' | 'markets' | 'telemetry' | 'settings';
  color: ColorValue;
  size?: number;
}

// Zigzag line + magnifying glass (double-peak trend + lens with handle).
// Simple ascending trend line — clean and minimal.
// Framed bar chart — box with three bars of ascending height.
// 8-spoke gear with central rotor.
const PATHS: Record<Props['name'], string> = {
  terminal:
    'M4 8 L8 4 L12 10 L16 6 L20 9 M14 16 a3 3 0 11-6 0 3 3 0 016 0 M13 18.5 L16 21',
  markets:
    'M4 16 L10 10 L14 13 L20 6',
  telemetry:
    'M4 5 h16 v14 h-16 z M8 16 v-4 M12 16 v-7 M16 16 v-3',
  settings:
    'M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

export function TabBarIcon({ name, color, size = 22 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].split(' M').map((seg, i) => (
        <Path
          key={i}
          d={i === 0 ? seg : `M${seg}`}
          stroke={color as string}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

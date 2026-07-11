import Svg, { Path, Line } from 'react-native-svg';
import { View } from 'react-native';
import { colors } from '@/theme';

interface Props {
  values: number[];
  width: number;
  height: number;
  color?: string;
}

export function Sparkline({
  values,
  width,
  height,
  color = colors.down,
}: Props) {
  if (values.length < 2) {
    return <View style={{ width, height }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const dx = width / (values.length - 1);

  let path = '';
  values.forEach((v, i) => {
    const x = i * dx;
    const y = height - ((v - min) / range) * height;
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Line
        x1={0}
        y1={height - 1}
        x2={width}
        y2={height - 1}
        stroke={colors.border}
        strokeWidth={1}
      />
      <Path d={fillPath} fill={color} fillOpacity={0.15} />
      <Path d={path} stroke={color} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

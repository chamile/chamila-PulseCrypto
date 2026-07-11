import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { fonts, fontSize, colors } from '@/theme';

type Variant =
  | 'headline'
  | 'headlineBold'
  | 'display'
  | 'body'
  | 'bodyMedium'
  | 'bodySemi'
  | 'label'
  | 'labelSmall'
  | 'mono'
  | 'monoBold';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  size?: number;
  style?: TextStyle;
}

const variants: Record<Variant, TextStyle> = {
  headline: { fontFamily: fonts.headline, fontSize: fontSize.lg },
  headlineBold: { fontFamily: fonts.headlineBold, fontSize: fontSize.xl },
  display: { fontFamily: fonts.headlineBold, fontSize: fontSize.display },
  body: { fontFamily: fonts.body, fontSize: fontSize.md },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: fontSize.md },
  bodySemi: { fontFamily: fonts.bodySemi, fontSize: fontSize.md },
  label: { fontFamily: fonts.bodyMedium, fontSize: fontSize.xs, letterSpacing: 0.5 },
  labelSmall: { fontFamily: fonts.bodyMedium, fontSize: fontSize.xxs, letterSpacing: 0.5 },
  mono: { fontFamily: fonts.mono, fontSize: fontSize.sm },
  monoBold: { fontFamily: fonts.monoBold, fontSize: fontSize.sm },
};

export function Text({
  variant = 'body',
  color = colors.text,
  size,
  style,
  ...rest
}: Props) {
  const base = variants[variant];
  return (
    <RNText
      {...rest}
      style={[base, { color }, size ? { fontSize: size } : null, style]}
    />
  );
}

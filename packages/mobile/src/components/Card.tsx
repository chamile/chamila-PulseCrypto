import { View, type ViewProps, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface Props extends ViewProps {
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export function Card({ padding = 'lg', style, children, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing[padding],
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

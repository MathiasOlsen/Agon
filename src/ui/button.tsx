import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';

import { TOUCH } from '@/theme/tokens';

import { useThemeTokens } from '@/state/app-provider';

import { Text } from './text';

/**
 * Buttons keep a 48×48 touch target, announce their role and state, and never
 * rely on colour alone: the label is always present.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  icon,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  accessibilityHint?: string;
  style?: ViewStyle;
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;

  const appearance: ViewStyle = (() => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: tokens.primary };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'danger':
        return { backgroundColor: tokens.danger };
      default:
        return { backgroundColor: tokens.primary };
    }
  })();

  const labelTone = (() => {
    switch (variant) {
      case 'secondary':
      case 'ghost':
        return 'primary' as const;
      default:
        return 'onPrimary' as const;
    }
  })();

  const inactive = disabled || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        {
          minHeight: TOUCH.minHeight,
          minWidth: TOUCH.minWidth,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: theme.treatment === 'stepped' ? 2 : 12,
          borderCurve: 'continuous',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
        appearance,
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={labelTone === 'onPrimary' ? tokens.onPrimary : tokens.primary} /> : icon}
      <Text variant="label" tone={labelTone} style={{ letterSpacing: 0.4 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  children,
  onPress,
  label,
  tone = 'default',
}: {
  children: ReactNode;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'primary' | 'danger';
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  const color =
    tone === 'danger' ? tokens.danger : tone === 'primary' ? tokens.primary : tokens.text;
  void color;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        minHeight: 44,
        minWidth: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View>{children}</View>
    </Pressable>
  );
}

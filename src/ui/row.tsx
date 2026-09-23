import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { TOUCH } from '@/theme/tokens';

import { useThemeTokens } from '@/state/app-provider';

import { PixelIcon } from './pixel-sprite';
import { Text } from './text';
import type { IconName } from '@/core/pixels/icons';

/** A settings-style row: icon, title, optional detail, optional trailing value. */

export function Row({
  icon,
  title,
  subtitle,
  detail,
  onPress,
  disabled = false,
  trailing,
  style,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  detail?: string;
  onPress?: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
  style?: ViewStyle;
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      {icon ? <PixelIcon name={icon} size={18} color={tokens.textMuted} accent={tokens.accent} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {detail ? (
        <Text variant="label" tone="muted" tabular>
          {detail}
        </Text>
      ) : null}
      {trailing ?? (onPress ? <PixelIcon name="chevron" size={14} color={tokens.textMuted} /> : null)}
    </View>
  );

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [{ minHeight: TOUCH.minHeight, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }, style]}
    >
      {content}
    </Pressable>
  );
}

export function ListSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Text variant="caption" tone="muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

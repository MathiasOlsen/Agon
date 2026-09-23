import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { CARD_PADDING } from '@/theme/tokens';

import { useThemeTokens } from '@/state/app-provider';

import { mix } from './color';
import { Text } from './text';

/**
 * Quest treatments, one per theme: outlined cards for Moss, a coloured rail for
 * Teal, stepped pixel corners for Ink and ticket notches for Clay. The
 * information order never changes between them; only the decoration does.
 */

export function Card({
  children,
  treatment,
  accentRail = false,
  style,
  accessible,
}: {
  children: ReactNode;
  /** Overrides the theme's own treatment, used for nested surfaces. */
  treatment?: 'outline' | 'rail' | 'stepped' | 'ticket' | 'plain';
  accentRail?: boolean;
  style?: ViewStyle;
  accessible?: boolean;
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  const kind = treatment ?? theme.treatment;

  const base: ViewStyle = {
    backgroundColor: tokens.surface,
    padding: CARD_PADDING,
    gap: 12,
  };

  const decorated: ViewStyle = (() => {
    switch (kind) {
      case 'outline':
        return {
          ...base,
          borderWidth: 1,
          borderColor: tokens.border,
          borderRadius: 6,
        };
      case 'rail':
        return {
          ...base,
          borderRadius: 16,
          borderCurve: 'continuous',
          borderLeftWidth: accentRail === false ? 0 : 4,
          borderLeftColor: tokens.primary,
        };
      case 'stepped':
        return { ...base, borderRadius: 2 };
      case 'ticket':
        return {
          ...base,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: mix(tokens.border, tokens.surface, 0.5),
        };
      default:
        return { ...base, borderRadius: 12 };
    }
  })();

  return (
    <View accessible={accessible} style={[decorated, style]}>
      {children}
    </View>
  );
}

export function CardHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="section">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

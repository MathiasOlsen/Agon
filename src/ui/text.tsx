import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { TYPE } from '@/theme/tokens';

import { useThemeTokens } from '@/state/app-provider';

/**
 * Type scale from the handoff: a large display face, clear section titles and a
 * comfortable body size. `tone` picks from the active theme, so a screen never
 * hard-codes a colour.
 */

export type TextVariant = 'display' | 'title' | 'section' | 'body' | 'label' | 'caption' | 'pixel';
export type TextTone = 'default' | 'muted' | 'primary' | 'onPrimary' | 'accent' | 'success' | 'danger';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Counters align better with tabular figures. */
  tabular?: boolean;
};

export function Text({
  variant = 'body',
  tone = 'default',
  tabular = false,
  style,
  ...rest
}: TextProps) {
  const theme = useThemeTokens();
  const { tokens } = theme;

  const color = (() => {
    switch (tone) {
      case 'muted':
        return tokens.textMuted;
      case 'primary':
        return tokens.primary;
      case 'onPrimary':
        return tokens.onPrimary;
      case 'accent':
        return tokens.onAccent;
      case 'success':
        return tokens.successText;
      case 'danger':
        return tokens.danger;
      default:
        return tokens.text;
    }
  })();

  const metrics = (() => {
    switch (variant) {
      case 'display':
        return { fontSize: TYPE.display, fontWeight: '800' as const, letterSpacing: 0.4, lineHeight: TYPE.display * 1.1 };
      case 'title':
        return { fontSize: TYPE.title, fontWeight: '800' as const, letterSpacing: 0.2, lineHeight: TYPE.title * 1.2 };
      case 'section':
        return { fontSize: TYPE.section, fontWeight: '700' as const, lineHeight: TYPE.section * 1.25 };
      case 'label':
        return { fontSize: TYPE.label, fontWeight: '600' as const, lineHeight: TYPE.label * 1.3 };
      case 'caption':
        return { fontSize: TYPE.caption, fontWeight: '500' as const, lineHeight: TYPE.caption * 1.35 };
      case 'pixel':
        return { fontSize: TYPE.label, fontWeight: '700' as const, letterSpacing: 1.2 };
      default:
        return { fontSize: TYPE.body, lineHeight: TYPE.body * 1.4 };
    }
  })();

  return (
    <RNText
      {...rest}
      style={[
        { color, flexShrink: 1 },
        metrics,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}

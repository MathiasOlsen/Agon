import { View, type ViewStyle } from 'react-native';

import { PIXEL } from '@/theme/tokens';
import { useApp, useThemeTokens } from '@/state/app-provider';

import { Text } from './text';

/**
 * Progress is always available as text, not only as a bar, and a completed
 * quest reads exactly full. The bar is decorative; the label is the truth.
 */

export function ProgressBar({
  value,
  max,
  label,
  height = PIXEL.barHeight,
  complete = false,
  style,
}: {
  value: number;
  max: number;
  label: string;
  height?: number;
  complete?: boolean;
  style?: ViewStyle;
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  const safeMax = max > 0 ? max : 1;
  const fraction = complete ? 1 : Math.max(0, Math.min(1, value / safeMax));
  const blocks = PIXEL.barBlocks;
  const filled = complete ? blocks : Math.round(fraction * blocks);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: safeMax, now: complete ? safeMax : Math.min(value, safeMax) }}
      style={[{ gap: 6 }, style]}
    >
      {/* A meter made of blocks, so it reads in the same language as the sprites. */}
      <View
        style={{
          flexDirection: 'row',
          gap: PIXEL.edgeThin,
          padding: PIXEL.edgeThin,
          borderWidth: PIXEL.edge,
          borderColor: tokens.border,
          backgroundColor: tokens.surface,
        }}
      >
        {Array.from({ length: blocks }).map((_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height,
              backgroundColor:
                index < filled
                  ? complete
                    ? tokens.successText
                    : tokens.primary
                  : tokens.progressTrack,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function XpChip({ xp, tone = 'accent' }: { xp: number; tone?: 'accent' | 'success' }) {
  const { theme, locale } = useApp();
  const { tokens } = theme;
  const background = tone === 'success' ? tokens.successSurface : tokens.accent;
  const color = tone === 'success' ? tokens.successText : tokens.onAccent;
  return (
    <View
      style={{
        backgroundColor: background,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: PIXEL.corner,
        borderWidth: PIXEL.edge,
        borderColor: tone === 'success' ? tokens.successText : tokens.border,
      }}
    >
      <Text variant="label" style={{ color }} tabular>
        {`+${new Intl.NumberFormat(locale).format(xp)} XP`}
      </Text>
    </View>
  );
}

import { View, type ViewStyle } from 'react-native';

import { useThemeTokens } from '@/state/app-provider';

import { mix } from './color';
import { Text } from './text';

/**
 * Progress is always available as text, not only as a bar, and a completed
 * quest reads exactly full. The bar is decorative; the label is the truth.
 */

export function ProgressBar({
  value,
  max,
  label,
  height = 10,
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
  const radius = theme.treatment === 'stepped' ? 0 : height / 2;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: safeMax, now: complete ? safeMax : Math.min(value, safeMax) }}
      style={[{ gap: 6 }, style]}
    >
      <View
        style={{
          height,
          borderRadius: radius,
          backgroundColor: tokens.progressTrack,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${fraction * 100}%`,
            height: '100%',
            backgroundColor: complete ? tokens.successText : tokens.primary,
          }}
        />
      </View>
    </View>
  );
}

export function SegmentedProgress({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  const segments = Math.max(1, Math.min(max, 12));
  const filled = Math.round((Math.min(value, max) / (max || 1)) * segments);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', gap: 3 }}
    >
      {Array.from({ length: segments }).map((_, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: 10,
            backgroundColor: index < filled ? tokens.primary : tokens.progressTrack,
            borderRadius: theme.treatment === 'stepped' ? 0 : 2,
          }}
        />
      ))}
    </View>
  );
}

export function XpChip({ xp, tone = 'accent' }: { xp: number; tone?: 'accent' | 'success' }) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  const background = tone === 'success' ? tokens.successSurface : tokens.accent;
  const color = tone === 'success' ? tokens.successText : tokens.onAccent;
  return (
    <View
      style={{
        backgroundColor: background,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.treatment === 'stepped' ? 2 : 999,
        borderWidth: tone === 'success' ? 1 : 0,
        borderColor: tone === 'success' ? mix(tokens.successText, tokens.surface, 0.6) : 'transparent',
      }}
    >
      <Text variant="label" style={{ color }} tabular>
        +{xp} XP
      </Text>
    </View>
  );
}

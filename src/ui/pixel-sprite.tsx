import { memo, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';

import { tierForLevel, type AppearanceTier } from '@/core/level';
import { buildCharacter, buildChip, type CharacterOptions } from '@/core/pixels/character';
import { toRects, type ColorKey, type Grid } from '@/core/pixels/grid';
import { buildIcon, ICON_SIZE, type IconName } from '@/core/pixels/icons';
import type { Appearance } from '@/core/types';
import type { Theme } from '@/theme/tokens';

import { mix, withAlpha } from './color';

/**
 * Pixel art, drawn as rectangles.
 *
 * `toRects` merges runs so a 32×32 character becomes a few dozen rectangles
 * instead of a thousand views, and every sprite is drawn at an integer scale so
 * the pixels stay square — nearest-neighbour by construction.
 */

export type SpritePalette = Partial<Record<ColorKey, string>>;

const SKIN: Record<Appearance['skin'], { base: string; shade: string }> = {
  sand: { base: '#EBC9A5', shade: '#CEA884' },
  honey: { base: '#DEAF7E', shade: '#BC8C60' },
  umber: { base: '#A8704A', shade: '#885638' },
  espresso: { base: '#6E4A36', shade: '#543728' },
};

const HAIR: Record<Appearance['hair'], { base: string; shade: string }> = {
  coils: { base: '#3A2A24', shade: '#281C18' },
  waves: { base: '#4A352C', shade: '#33241D' },
  crop: { base: '#2F2621', shade: '#201A16' },
  braids: { base: '#3A2A24', shade: '#281C18' },
  puff: { base: '#412F27', shade: '#2C1F1A' },
};

const GOLDEN = { base: '#E8C36A', shade: '#C79C43' };

export function paletteFor(
  theme: Theme,
  appearance: Appearance,
  tier: AppearanceTier,
): SpritePalette {
  const { tokens, isDark, treatment } = theme;
  const skin = SKIN[appearance.skin];
  const hair = tier === 'ascendant' || tier === 'radiant' ? HAIR[appearance.hair] : HAIR[appearance.hair];
  const golden = tier === 'ascendant' ? GOLDEN : hair;
  return {
    skin: skin.base,
    skinShade: skin.shade,
    hair: golden.base,
    hairShade: golden.shade,
    outfit: tokens.primary,
    outfitShade: isDark ? mix(tokens.primary, tokens.text, 0.35) : mix(tokens.primary, '#000000', 0.45),
    ink: tokens.text,
    accent: tokens.accent,
    accentSoft: mix(tokens.accent, tokens.background, 0.45),
    white: '#FFFFFF',
    aura: withAlpha(tokens.accent, 0.55),
    shadow: treatment === 'stepped' && isDark
      ? withAlpha(tokens.text, 0.12)
      : mix(tokens.background, tokens.text, 0.12),
  };
}

export function useCharacterGrid(options: CharacterOptions): Grid {
  return useMemo(() => buildCharacter(options), [options.level, options.mood, options.appearance]);
}

export function SpriteRects({
  grid,
  scale,
  palette,
  style,
}: {
  grid: Grid;
  scale: number;
  palette: SpritePalette;
  style?: ViewStyle;
}) {
  const rects = useMemo(() => toRects(grid), [grid]);
  const width = (grid[0]?.length ?? 0) * scale;
  const height = grid.length * scale;
  return (
    <View
      style={[
        { width, height, position: 'relative' },
        style,
      ]}
    >
      {rects.map((rect) => (
        <View
          key={`${rect.x}-${rect.y}-${rect.w}-${rect.h}-${rect.key}`}
          style={{
            position: 'absolute',
            left: rect.x * scale,
            top: rect.y * scale,
            width: rect.w * scale,
            height: rect.h * scale,
            backgroundColor: palette[rect.key] ?? '#00000000',
          }}
        />
      ))}
    </View>
  );
}

/**
 * The companion. `label` carries the text equivalent of the sprite, because a
 * drawing cannot be read out loud.
 */
export const CompanionSprite = memo(function CompanionSprite({
  level,
  mood,
  appearance,
  theme,
  scale = 4,
  label,
}: {
  level: number;
  mood: CharacterOptions['mood'];
  appearance: Appearance;
  theme: Theme;
  scale?: number;
  label: string;
}) {
  const grid = useCharacterGrid({ level, mood, appearance });
  const palette = paletteFor(theme, appearance, tierForLevel(level));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <SpriteRects grid={grid} scale={scale} palette={palette} />
    </View>
  );
});

export const SpriteChip = memo(function SpriteChip({
  level,
  mood,
  theme,
  appearance,
  scale = 2,
}: {
  level: number;
  mood: CharacterOptions['mood'];
  theme: Theme;
  appearance: Appearance;
  scale?: number;
}) {
  const grid = useMemo(() => buildChip(level, mood), [level, mood]);
  const palette = paletteFor(theme, appearance, tierForLevel(level));
  return <SpriteRects grid={grid} scale={scale} palette={palette} />;
});

/** Interface glyphs, drawn from the same pixel data as the character. */
export const PixelIcon = memo(function PixelIcon({
  name,
  size = 16,
  color,
  accent,
}: {
  name: IconName;
  size?: number;
  color: string;
  accent?: string;
}) {
  const grid = useMemo(() => buildIcon(name), [name]);
  const scale = Math.max(1, Math.round(size / ICON_SIZE));
  const palette: SpritePalette = { ink: color, accent: accent ?? color };
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <SpriteRects grid={grid} scale={scale} palette={palette} />
    </View>
  );
});

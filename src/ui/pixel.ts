import type { ViewStyle } from 'react-native';

import { PIXEL } from '@/theme/tokens';

/**
 * A hard offset shadow.
 *
 * Pixel art has no soft falloff, so a raised surface casts one solid block of
 * colour rather than a blur. It reads as a printed sticker sitting on the page,
 * which is the same language the sprites and the block meters already speak.
 */
export function hardShadow(color: string, offset: number = PIXEL.offset): ViewStyle {
  return { boxShadow: `${offset}px ${offset}px 0 ${color}` };
}

import { View } from 'react-native';

import type { Appearance, HairStyle, Outfit, SkinTone } from '@/core/types';
import { PIXEL } from '@/theme/tokens';
import { useApp } from '@/state/app-provider';

import { OptionPill } from './controls';
import { CompanionSprite, paletteFor } from './pixel-sprite';
import { Text } from './text';
import { tierForLevel } from '@/core/level';

/**
 * Skin, hair and outfit choices. Nothing here is tied to theme, goal or
 * difficulty, and every option is available from the start.
 */

const SKIN_TONES: SkinTone[] = ['sand', 'honey', 'umber', 'espresso'];
const HAIR_STYLES: HairStyle[] = ['coils', 'waves', 'crop', 'braids', 'puff'];
const OUTFITS: Outfit[] = ['tee', 'tank', 'hoodie', 'jacket'];

export function AppearancePicker({
  appearance,
  onChange,
  level = 8,
}: {
  appearance: Appearance;
  onChange: (appearance: Appearance) => void;
  level?: number;
}) {
  const { theme, t } = useApp();

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text variant="label">{t('avatar.skinTone')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {SKIN_TONES.map((skin) => {
            const palette = paletteFor(theme, { ...appearance, skin }, tierForLevel(level));
            return (
              <OptionPill
                key={skin}
                selected={appearance.skin === skin}
                label={t(`skin.${skin}` as 'skin.sand')}
                onPress={() => onChange({ ...appearance, skin })}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: PIXEL.cornerSoft,
                    backgroundColor: palette.skin,
                    borderWidth: PIXEL.edge,
                    borderColor: palette.skinShade,
                  }}
                />
              </OptionPill>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="label">{t('avatar.hair')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {HAIR_STYLES.map((hair) => (
            <OptionPill
              key={hair}
              selected={appearance.hair === hair}
              label={t(`hair.${hair}` as 'hair.coils')}
              onPress={() => onChange({ ...appearance, hair })}
            >
              <CompanionSprite
                level={level}
                mood="ready"
                appearance={{ ...appearance, hair }}
                theme={theme}
                scale={2}
                label={t(`hair.${hair}` as 'hair.coils')}
              />
            </OptionPill>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="label">{t('avatar.outfit')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {OUTFITS.map((outfit) => {
            const palette = paletteFor(theme, { ...appearance, outfit }, tierForLevel(level));
            return (
              <OptionPill
                key={outfit}
                selected={appearance.outfit === outfit}
                label={t(`outfit.${outfit}` as 'outfit.tee')}
                onPress={() => onChange({ ...appearance, outfit })}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: PIXEL.cornerSoft,
                    backgroundColor: palette.outfit,
                    borderWidth: PIXEL.edge,
                    borderColor: palette.outfitShade,
                  }}
                />
              </OptionPill>
            );
          })}
        </View>
      </View>
    </View>
  );
}

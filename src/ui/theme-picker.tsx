import { View } from 'react-native';

import { THEMES } from '@/theme/tokens';
import type { ThemeId } from '@/core/types';
import { useApp } from '@/state/app-provider';

import { OptionPill } from './controls';
import { Text } from './text';

/**
 * Four themes, all included, always switchable. The swatch shows the theme's own
 * background, surface, primary and accent so the choice is visible before it is
 * applied.
 */

const ORDER: ThemeId[] = ['moss', 'teal', 'ink', 'clay'];

export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}) {
  const { t } = useApp();
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label">{t('profile.theme')}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {ORDER.map((id) => {
          const theme = THEMES[id];
          const name = t(theme.nameKey as 'theme.teal');
          return (
            <OptionPill
              key={id}
              selected={value === id}
              label={name}
              onPress={() => onChange(id)}
            >
              <View style={{ flexDirection: 'row', gap: 2 }}>
                <View style={{ width: 12, height: 26, backgroundColor: theme.tokens.background }} />
                <View style={{ width: 12, height: 26, backgroundColor: theme.tokens.primary }} />
                <View style={{ width: 12, height: 26, backgroundColor: theme.tokens.accent }} />
              </View>
            </OptionPill>
          );
        })}
      </View>
      <Text variant="caption" tone="muted">
        {t('theme.included')}
      </Text>
    </View>
  );
}

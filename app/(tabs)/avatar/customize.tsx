import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useApp } from '@/state/app-provider';
import { useLevelProgress } from '@/state/hooks';
import { AppearancePicker } from '@/ui/appearance-picker';
import { Button } from '@/ui/button';
import { CompanionSprite } from '@/ui/pixel-sprite';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

export default function CustomizeAvatar() {
  const { store, state, theme, t } = useApp();
  const router = useRouter();
  const progress = useLevelProgress();
  const [appearance, setAppearance] = useState(state.preferences.appearance);

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <CompanionSprite
          level={progress.level}
          mood="ready"
          appearance={appearance}
          theme={theme}
          scale={6}
          label={t('a11y.avatar', { level: progress.level, mood: t('mood.ready') })}
        />
      </View>

      <Text variant="body" tone="muted">
        {t('onboarding.avatar.body')}
      </Text>

      <AppearancePicker appearance={appearance} onChange={setAppearance} level={progress.level} />

      <Text variant="caption" tone="muted">
        {t('avatar.everyLookIncluded')}
      </Text>

      <Button
        label={t('avatar.saveLook')}
        onPress={() => {
          store.setPreferences({ appearance }, new Date().toISOString());
          router.back();
        }}
      />
    </Screen>
  );
}

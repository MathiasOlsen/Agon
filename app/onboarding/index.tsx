import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card } from '@/ui/card';
import { OnboardingShell } from '@/ui/onboarding-shell';
import { PixelIcon } from '@/ui/pixel-sprite';
import { Text } from '@/ui/text';
import { useApp } from '@/state/app-provider';

export default function Welcome() {
  const { theme, t } = useApp();
  const router = useRouter();

  return (
    <OnboardingShell
      step={1}
      title={t('onboarding.welcome.headline')}
      body={t('onboarding.welcome.body')}
      nextLabel={t('onboarding.welcome.start')}
      onNext={() => router.push('/onboarding/avatar')}
    >
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <PixelIcon name="lock" size={18} color={theme.tokens.textMuted} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="section">{t('onboarding.welcome.localTitle')}</Text>
            <Text variant="caption" tone="muted">
              {t('onboarding.welcome.localBody')}
            </Text>
          </View>
        </View>
      </Card>
    </OnboardingShell>
  );
}

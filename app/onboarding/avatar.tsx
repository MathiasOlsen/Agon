import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppearancePicker } from '@/ui/appearance-picker';
import { OnboardingShell } from '@/ui/onboarding-shell';
import { ThemePicker } from '@/ui/theme-picker';
import { useApp } from '@/state/app-provider';

export default function ChooseLook() {
  const { store, state, t } = useApp();
  const router = useRouter();
  const now = new Date().toISOString();

  return (
    <OnboardingShell
      step={2}
      title={t('onboarding.avatar.title')}
      body={t('onboarding.avatar.body')}
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/preferences')}
      nextLabel={t('onboarding.next')}
    >
      <View style={{ gap: 24 }}>
        <AppearancePicker
          appearance={state.preferences.appearance}
          onChange={(appearance) => store.setPreferences({ appearance }, now)}
        />
        <ThemePicker
          value={state.preferences.theme}
          onChange={(theme) => store.setPreferences({ theme }, now)}
        />
      </View>
    </OnboardingShell>
  );
}

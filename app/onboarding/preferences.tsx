import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card } from '@/ui/card';
import { SegmentedControl } from '@/ui/controls';
import { OnboardingShell } from '@/ui/onboarding-shell';
import { Text } from '@/ui/text';
import { useApp } from '@/state/app-provider';

export default function PreferencesStep() {
  const { store, state, t } = useApp();
  const router = useRouter();
  const now = new Date().toISOString();
  const { preferences } = state;

  return (
    <OnboardingShell
      step={3}
      title={t('onboarding.prefs.title')}
      body={t('onboarding.prefs.body')}
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/plan')}
    >
      <View style={{ gap: 16 }}>
        <Card>
          <Text variant="label">{t('prefs.language')}</Text>
          <SegmentedControl
            label={t('prefs.language')}
            value={preferences.locale}
            onChange={(locale) => store.setPreferences({ locale }, now)}
            options={[
              { value: 'en', label: t('prefs.english') },
              { value: 'da', label: t('prefs.danish') },
            ]}
          />
          <Text variant="caption" tone="muted">
            {t('prefs.languageHint')}
          </Text>
        </Card>

        <Card>
          <Text variant="label">{t('prefs.weekStart')}</Text>
          <SegmentedControl
            label={t('prefs.weekStart')}
            value={String(preferences.weekStart)}
            onChange={(value) => store.setPreferences({ weekStart: value === '7' ? 7 : 1 }, now)}
            options={[
              { value: '1', label: t('prefs.monday') },
              { value: '7', label: t('prefs.sunday') },
            ]}
          />
        </Card>

        <Card>
          <Text variant="label">{t('prefs.weightUnit')}</Text>
          <SegmentedControl
            label={t('prefs.weightUnit')}
            value={preferences.loadUnit}
            onChange={(loadUnit) => store.setPreferences({ loadUnit }, now)}
            options={[
              { value: 'kg', label: t('prefs.kilograms') },
              { value: 'lb', label: t('prefs.pounds') },
            ]}
          />
          <Text variant="label">{t('prefs.distanceUnit')}</Text>
          <SegmentedControl
            label={t('prefs.distanceUnit')}
            value={preferences.distanceUnit}
            onChange={(distanceUnit) => store.setPreferences({ distanceUnit }, now)}
            options={[
              { value: 'km', label: t('prefs.km') },
              { value: 'mi', label: t('prefs.miles') },
            ]}
          />
        </Card>
      </View>
    </OnboardingShell>
  );
}

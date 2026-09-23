import { View } from 'react-native';

import { useApp } from '@/state/app-provider';
import { Card, CardHeader } from '@/ui/card';
import { SegmentedControl } from '@/ui/controls';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

export default function PreferencesScreen() {
  const { store, state, t } = useApp();
  const now = new Date().toISOString();
  const { preferences } = state;

  return (
    <Screen>
      <Card>
        <CardHeader title={t('prefs.language')} subtitle={t('prefs.languageHint')} />
        <SegmentedControl
          label={t('prefs.language')}
          value={preferences.locale}
          onChange={(locale) => store.setPreferences({ locale }, now)}
          options={[
            { value: 'en', label: t('prefs.english') },
            { value: 'da', label: t('prefs.danish') },
          ]}
        />
      </Card>

      <Card>
        <CardHeader title={t('prefs.units')} />
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

      <Card>
        <CardHeader title={t('prefs.weekStart')} />
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
        <CardHeader title={t('prefs.timeZone')} subtitle={preferences.timeZone} />
        <View style={{ gap: 4 }}>
          <Text variant="caption" tone="muted">
            {t('quests.recoveryCounts')}
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

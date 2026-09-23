import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { defaultCatalogueKeys } from '@/state/defaults';
import { Card } from '@/ui/card';
import { Stepper, ToggleRow } from '@/ui/controls';
import { OnboardingShell } from '@/ui/onboarding-shell';
import { Text } from '@/ui/text';
import { scheduleReminders } from '@/services/notifications';
import { useApp } from '@/state/app-provider';

export default function RemindersStep() {
  const { store, state, t } = useApp();
  const router = useRouter();
  const now = new Date().toISOString();
  const { reminders } = state.preferences;

  const finish = async () => {
    const plan = state.planSlots;
    for (const key of defaultCatalogueKeys(plan)) {
      store.enableCatalogue(key, true, null, now);
    }
    store.setPreferences({ onboarded: true }, now);
    await scheduleReminders({
      preferences: { ...state.preferences, reminders },
      plan,
      title: t('reminders.title'),
      body: t('reminders.body'),
    });
    router.replace('/(tabs)/today');
  };

  return (
    <OnboardingShell
      step={5}
      title={t('onboarding.reminders.title')}
      body={t('onboarding.reminders.body')}
      showAvatar={false}
      onBack={() => router.back()}
      nextLabel={t('onboarding.finish')}
      onNext={() => {
        void finish();
      }}
    >
      <Card>
        <ToggleRow
          title={t('onboarding.reminders.enable')}
          value={reminders.enabled}
          onChange={(enabled) =>
            store.setPreferences({ reminders: { ...reminders, enabled } }, now)
          }
        />
        {reminders.enabled ? (
          <View style={{ gap: 12 }}>
            <ToggleRow
              title={t('reminders.plannedOnly')}
              value={reminders.plannedDaysOnly}
              onChange={(plannedDaysOnly) =>
                store.setPreferences({ reminders: { ...reminders, plannedDaysOnly } }, now)
              }
            />
            <View style={{ gap: 6 }}>
              <Text variant="label">{t('reminders.time')}</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Stepper
                  label={t('reminders.time')}
                  value={reminders.hour}
                  min={0}
                  max={23}
                  onChange={(hour) => store.setPreferences({ reminders: { ...reminders, hour } }, now)}
                  format={(value) => `${String(value).padStart(2, '0')}h`}
                />
                <Stepper
                  label={t('reminders.time')}
                  value={reminders.minute}
                  step={5}
                  min={0}
                  max={55}
                  onChange={(minute) =>
                    store.setPreferences({ reminders: { ...reminders, minute } }, now)
                  }
                  format={(value) => `${String(value).padStart(2, '0')}m`}
                />
              </View>
            </View>
            <Text variant="caption" tone="muted">
              {t('reminders.genericHint')}
            </Text>
          </View>
        ) : null}
      </Card>
    </OnboardingShell>
  );
}

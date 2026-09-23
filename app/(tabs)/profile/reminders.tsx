import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { scheduleReminders } from '@/services/notifications';
import { useApp } from '@/state/app-provider';
import { Card, CardHeader } from '@/ui/card';
import { Stepper, ToggleRow } from '@/ui/controls';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

export default function RemindersScreen() {
  const { store, state, t } = useApp();
  const { reminders } = state.preferences;
  const [scheduled, setScheduled] = useState<number | null>(null);

  // The schedule is regenerated whenever a setting changes, so switching
  // language or time can never leave a duplicate behind.
  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await scheduleReminders({
        preferences: state.preferences,
        plan: state.planSlots,
        title: t('reminders.title'),
        body: t('reminders.body'),
      });
      if (active) setScheduled(result.scheduled);
    })();
    return () => {
      active = false;
    };
  }, [state.preferences, state.planSlots, t]);

  return (
    <Screen>
      <Card>
        <CardHeader title={t('reminders.enable')} subtitle={t('reminders.body')} />
        <ToggleRow
          title={t('reminders.enable')}
          value={reminders.enabled}
          onChange={(enabled) =>
            store.setPreferences(
              { reminders: { ...reminders, enabled } },
              new Date().toISOString(),
            )
          }
        />
        <ToggleRow
          title={t('reminders.plannedOnly')}
          value={reminders.plannedDaysOnly}
          onChange={(plannedDaysOnly) =>
            store.setPreferences(
              { reminders: { ...reminders, plannedDaysOnly } },
              new Date().toISOString(),
            )
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
              onChange={(hour) =>
                store.setPreferences({ reminders: { ...reminders, hour } }, new Date().toISOString())
              }
              format={(value) => `${String(value).padStart(2, '0')}h`}
            />
            <Stepper
              label={t('reminders.time')}
              value={reminders.minute}
              step={5}
              min={0}
              max={55}
              onChange={(minute) =>
                store.setPreferences(
                  { reminders: { ...reminders, minute } },
                  new Date().toISOString(),
                )
              }
              format={(value) => `${String(value).padStart(2, '0')}m`}
            />
          </View>
        </View>
        {scheduled !== null ? (
          <Text variant="caption" tone="muted" tabular>
            {t('reminders.saved')} ({scheduled})
          </Text>
        ) : null}
      </Card>

      <Card>
        <CardHeader title={t('reminders.generic')} subtitle={t('reminders.genericHint')} />
        {scheduled === 0 && reminders.enabled ? (
          <Text variant="caption" tone="danger">
            {t('reminders.denied')}
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}

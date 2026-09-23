import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { formatLocalDate, formatLocalTimeOfDay, localDateOf } from '@/core/dates';
import type { ActivityEvent } from '@/core/types';
import { useApp } from '@/state/app-provider';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { SegmentedControl, Stepper } from '@/ui/controls';
import { EmptyState, Screen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { unitNameKey } from '@/ui/units';

/**
 * History is where a record can be corrected. A correction updates the affected
 * totals transactionally and reverses any reward it invalidates — the ledger
 * keeps the history of the change rather than quietly rewriting it.
 */

export default function HistoryScreen() {
  const { store, state, t } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);

  const events = [...state.activityEvents]
    .filter((event) => event.deletedAt === null)
    .sort((a, b) => (a.localDate < b.localDate ? 1 : a.localDate > b.localDate ? -1 : 0));

  const confirmDelete = (event: ActivityEvent) => {
    Alert.alert(t('history.deleteConfirm'), t('history.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          store.deleteActivity(event.id, new Date().toISOString());
          setEditingId(null);
        },
      },
    ]);
  };

  if (events.length === 0) {
    return (
      <Screen>
        <EmptyState title={t('history.empty')} body={t('history.emptyHint')} />
      </Screen>
    );
  }

  return (
    <Screen>
      {events.map((event) => {
        const editing = editingId === event.id;
        return (
          <Card key={event.id}>
            <View style={{ gap: 4 }}>
              <Text variant="label">
                {t(`activity.${event.kind}` as 'activity.strength')}
              </Text>
              <Text variant="caption" tone="muted" tabular>
                {formatLocalDate(event.localDate, state.preferences.locale)} ·{' '}
                {formatLocalTimeOfDay(event.occurredAt, state.preferences.timeZone, state.preferences.locale)}
              </Text>
              <Text variant="caption" tone="muted">
                {t('unit.of', { done: event.quantity, target: event.quantity })}{' '}
                {t(unitNameKey(event.measure))}
              </Text>
            </View>

            {editing ? (
              <View style={{ gap: 12 }}>
                <Text variant="label">{t('history.quantity')}</Text>
                <Stepper
                  label={t('history.quantity')}
                  value={event.quantity}
                  step={event.measure === 'minutes' ? 5 : 1}
                  min={1}
                  max={event.measure === 'steps' ? 100_000 : 1_000}
                  onChange={(quantity) =>
                    store.correctActivity(event.id, { quantity }, new Date().toISOString())
                  }
                />
                <View style={{ gap: 6 }}>
                  <Text variant="label">{t('history.date')}</Text>
                  <SegmentedControl
                    label={t('history.date')}
                    value={
                      event.localDate === localDateOf(new Date().toISOString(), state.preferences.timeZone)
                        ? 'today'
                        : 'other'
                    }
                    onChange={(value) => {
                      if (value !== 'today') return;
                      store.correctActivity(
                        event.id,
                        { localDate: localDateOf(new Date().toISOString(), state.preferences.timeZone) },
                        new Date().toISOString(),
                      );
                    }}
                    options={[
                      { value: 'today', label: t('nav.today') },
                      { value: 'other', label: formatLocalDate(event.localDate, state.preferences.locale, { day: 'numeric', month: 'short' }) },
                    ]}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Button label={t('common.close')} variant="secondary" onPress={() => setEditingId(null)} />
                  <Button label={t('history.delete')} variant="danger" onPress={() => confirmDelete(event)} />
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('history.correct')}
                onPress={() => setEditingId(event.id)}
              >
                <Text variant="label" tone="primary">
                  {t('history.correct')}
                </Text>
              </Pressable>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

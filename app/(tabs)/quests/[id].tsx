import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { formatLocalDate } from '@/core/dates';
import { useApp } from '@/state/app-provider';
import { useInstance } from '@/state/hooks';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { Stepper } from '@/ui/controls';
import { ProgressBar, XpChip } from '@/ui/progress-bar';
import { EmptyState, Screen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { unitNameKey } from '@/ui/units';

/**
 * A quest in plain language: what it asks for, how it is measured, what counts,
 * and every way to correct it. Manual entry is the MVP's only source.
 */

export default function QuestDetail() {
  const { store, state, t } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const instance = useInstance(id);
  const [amount, setAmount] = useState(10);
  const now = new Date().toISOString();

  if (!instance) {
    return (
      <Screen>
        <EmptyState title={t('quests.empty')} body={t('quests.emptyHint')} />
      </Screen>
    );
  }

  const title = t(`quest.${instance.catalogueKey}.title` as 'quest.show_up.title');
  const objective = t(`quest.${instance.catalogueKey}.objective` as 'quest.show_up.objective');
  const completed = instance.status === 'completed';
  const isCheckoff = instance.measure === 'checkoff';
  const step = instance.measure === 'minutes' ? 5 : instance.measure === 'steps' ? 500 : 1;

  const logAmount = (quantity: number) => {
    store.logActivity(
      {
        id: `act:${instance.id}:${state.activityEvents.length}`,
        kind: instance.activityKinds[0] ?? 'movement',
        measure: instance.measure,
        quantity,
        occurredAt: now,
        localDate: instance.startDate,
        timeZone: state.preferences.timeZone,
        source: 'manual',
        sourceId: null,
        revision: 1,
        deletedAt: null,
        note: '',
      },
      now,
    );
  };

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text variant="display">{title}</Text>
        <Text variant="body" tone="muted">
          {objective}
        </Text>
      </View>

      <Card>
        <CardHeader
          title={t('quests.thatCounts')}
          subtitle={t(`period.${instance.periodKind}.one` as 'period.daily.one')}
          trailing={<XpChip xp={instance.xp} />}
        />
        <ProgressBar
          value={instance.progress}
          max={instance.target}
          complete={completed}
          label={t('a11y.progress', {
            label: title,
            current: instance.progress,
            target: instance.target,
          })}
        />
        <Text variant="label" tabular>
          {completed
            ? t('a11y.completed', { label: title })
            : `${t('unit.of', { done: instance.progress, target: instance.target })} ${t(
                unitNameKey(instance.measure),
              )}`}
        </Text>
        <Text variant="caption" tone="muted" tabular>
          {formatLocalDate(instance.startDate, state.preferences.locale)} –{' '}
          {formatLocalDate(instance.endDate, state.preferences.locale)}
        </Text>
      </Card>

      {isCheckoff ? (
        <Card>
          <Button
            label={t('common.done')}
            onPress={() => store.checkoff(instance.id, now)}
            disabled={completed}
          />
        </Card>
      ) : instance.measure === 'planned_sessions' ? (
        <Card>
          <CardHeader title={t('quests.thatCounts')} subtitle={t('quests.plannedBySession')} />
        </Card>
      ) : (
        <Card>
          <CardHeader title={t('quests.addLog')} subtitle={t('history.manual')} />
          <Stepper
            label={t('history.quantity')}
            value={amount}
            step={step}
            min={1}
            max={instance.measure === 'steps' ? 50_000 : 500}
            onChange={setAmount}
          />
          <Button label={t('quests.addLog')} onPress={() => logAmount(amount)} />
        </Card>
      )}

      {completed && !instance.celebrationAcknowledged ? (
        <Button label={t('xp.claim')} onPress={() => store.acknowledge(instance.id)} />
      ) : null}

      <Text variant="caption" tone="muted">
        {instance.kind === 'main' ? t('quests.main') : t('quests.supporting')}
      </Text>
      <Text variant="caption" tone="muted">
        {t('quests.loggedOnce')}
      </Text>
    </Screen>
  );
}

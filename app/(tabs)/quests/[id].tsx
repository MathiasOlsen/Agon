import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { formatLocalDate, localDateOf } from '@/core/dates';
import { scheduledSessionsForDate } from '@/core/engine';
import { countsSentenceKey, questBreakdown, type ProgressItem } from '@/core/progress';
import type { QuestInstance } from '@/core/types';
import { useApp } from '@/state/app-provider';
import { useInstance } from '@/state/hooks';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { Stepper } from '@/ui/controls';
import { PixelIcon } from '@/ui/pixel-sprite';
import { ProgressBar, XpChip } from '@/ui/progress-bar';
import { EmptyState, Screen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { unitLabelKey, unitNameKey } from '@/ui/units';

/**
 * A quest's progress, in plain language.
 *
 * Nothing is typed in here: progress comes from finished sessions and logged
 * activity, so this screen shows what is done, what was missed and what is still
 * to come. Logging stays available only where there is no other route — a
 * distance or a pile of minutes has nowhere else to be recorded.
 */

export default function QuestProgress() {
  const { store, state, theme, t } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const instance = useInstance(id);
  const [amount, setAmount] = useState(10);
  const now = new Date().toISOString();
  const today = localDateOf(now, state.preferences.timeZone);

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
  const isPlanBased = instance.measure === 'planned_sessions';
  const breakdown = questBreakdown(state, instance, today);
  const todaySession = scheduledSessionsForDate(state, today).find(
    (session) => session.status === 'planned' || session.status === 'in_progress',
  );

  const row = (item: ProgressItem) => (
    <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <PixelIcon
        name={item.status === 'done' ? 'check' : 'clock'}
        size={14}
        color={item.status === 'done' ? theme.tokens.successText : theme.tokens.textMuted}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label">
          {item.amount === null
            ? t(item.titleKey as 'plan.strengthSession')
            : t(unitLabelKey(instance.measure), { count: item.amount })}
        </Text>
        <Text variant="caption" tone="muted" tabular>
          {formatLocalDate(item.date, state.preferences.locale, { weekday: 'short', day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <Text
        variant="caption"
        tone={item.status === 'done' ? 'success' : item.status === 'missed' ? 'muted' : 'primary'}
      >
        {item.status === 'done'
          ? t('quests.listDone')
          : item.status === 'missed'
            ? t('quests.listMissed')
            : item.status === 'today'
              ? t('quests.today')
              : t('quests.listUpcoming')}
      </Text>
    </View>
  );

  const done = breakdown.items.filter((item) => item.status === 'done');
  const missed = breakdown.items.filter((item) => item.status === 'missed');
  const upcoming = breakdown.items.filter(
    (item) => item.status === 'today' || item.status === 'upcoming',
  );

  const logAmount = (quantity: number) => {
    store.logActivity(
      {
        id: `act:${instance.id}:${state.activityEvents.length}`,
        kind: instance.activityKinds[0] ?? 'movement',
        measure: instance.measure,
        quantity,
        occurredAt: now,
        localDate: instance.startDate <= today && today <= instance.endDate ? today : instance.startDate,
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
          subtitle={t(countsSentenceKey(instance) as 'quests.counts.sessions')}
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
        {!completed && breakdown.remaining > 0 ? (
          <Text variant="caption" tone="muted" tabular>
            {t('quests.remaining', { count: breakdown.remaining })}
          </Text>
        ) : null}
      </Card>

      {breakdown.items.length === 0 ? (
        isCheckoff ? null : (
          <Card>
            <Text variant="caption" tone="muted">
              {t('quests.nothingLogged')}
            </Text>
          </Card>
        )
      ) : (
        <Card>
          <CardHeader
            title={t('quests.seeProgress')}
            subtitle={t('unit.of', { done: breakdown.done, target: instance.target })}
          />
          {done.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text variant="caption" tone="muted">
                {t('quests.listDone')}
              </Text>
              {done.map(row)}
            </View>
          ) : null}
          {missed.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text variant="caption" tone="muted">
                {t('quests.listMissed')}
              </Text>
              {missed.map(row)}
            </View>
          ) : null}
          {upcoming.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text variant="caption" tone="muted">
                {t('quests.listUpcoming')}
              </Text>
              {upcoming.map(row)}
            </View>
          ) : null}
        </Card>
      )}

      {isCheckoff ? (
        <Card>
          <Button
            label={t('common.done')}
            onPress={() => store.checkoff(instance.id, now)}
            disabled={completed}
          />
        </Card>
      ) : null}

      {isPlanBased && todaySession ? (
        <Button
          label={t('quests.goToSession')}
          variant="secondary"
          onPress={() => router.push(`/session/${todaySession.id}`)}
        />
      ) : null}

      {!isCheckoff && !isPlanBased ? (
        <Card>
          <CardHeader title={t('quests.logLabel')} subtitle={t('history.manual')} />
          <Stepper
            label={t('history.quantity')}
            value={amount}
            step={instance.measure === 'minutes' ? 5 : instance.measure === 'seconds' ? 15 : 1}
            min={1}
            max={instance.measure === 'steps' ? 50_000 : 600}
            onChange={setAmount}
          />
          <Button label={t('quests.logLabel')} onPress={() => logAmount(amount)} />
        </Card>
      ) : null}

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

export type { QuestInstance };

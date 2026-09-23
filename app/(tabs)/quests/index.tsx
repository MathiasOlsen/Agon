import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { formatLocalDate } from '@/core/dates';
import type { PeriodKind, QuestInstance } from '@/core/types';
import { useApp } from '@/state/app-provider';
import { useInstancesForPeriod, usePeriodCounters } from '@/state/hooks';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { SegmentedControl } from '@/ui/controls';
import { PixelIcon } from '@/ui/pixel-sprite';
import { ProgressBar, XpChip } from '@/ui/progress-bar';
import { EmptyState, Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

const PERIODS: PeriodKind[] = ['daily', 'weekly', 'monthly', 'yearly'];

/**
 * The quest board. Active quests come first, completed ones below, and an
 * archived period stays readable: it is a record, not a scoreboard.
 */

export default function QuestBoard() {
  const { state, theme, t } = useApp();
  const [period, setPeriod] = useState<PeriodKind>('daily');
  const now = new Date().toISOString();
  const instances = useInstancesForPeriod(period, now);
  const counters = usePeriodCounters(now);

  const renderQuest = (instance: QuestInstance) => {
    const completed = instance.status === 'completed';
    const title = t(`quest.${instance.catalogueKey}.title` as 'quest.show_up.title');
    return (
      <Card key={instance.id} accentRail>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PixelIcon
                name={instance.kind === 'main' ? 'star' : 'check'}
                size={14}
                color={instance.kind === 'main' ? theme.tokens.accent : theme.tokens.textMuted}
              />
              <Text variant="section" style={{ flex: 1 }}>
                {title}
              </Text>
            </View>
            <Text variant="caption" tone="muted">
              {t(`quest.${instance.catalogueKey}.objective` as 'quest.show_up.objective')}
            </Text>
          </View>
          <XpChip xp={instance.xp} />
        </View>

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

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="caption" tone={completed ? 'success' : 'muted'} tabular>
            {completed
              ? t('quests.completed')
              : t('unit.of', { done: instance.progress, target: instance.target })}
          </Text>
          <Link href={`/(tabs)/quests/${instance.id}`} asChild>
            <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => undefined}>
              <Text variant="label" tone="primary">
                {t('quests.addLog')}
              </Text>
            </Pressable>
          </Link>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <SegmentedControl
        label={t('quests.board')}
        value={period}
        onChange={setPeriod}
        options={PERIODS.map((kind) => ({
          value: kind,
          label: t(`period.${kind}` as 'period.daily'),
        }))}
      />

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="muted">
          {t('quests.active')}
        </Text>
        {instances.active.length === 0 && state.questInstances.length === 0 ? (
          <EmptyState
            title={t('quests.empty')}
            body={t('quests.emptyHint')}
            action={
              <Link href="/(tabs)/quests/add" asChild>
                <Button label={t('quests.addQuest')} onPress={() => undefined} />
              </Link>
            }
          />
        ) : instances.active.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('quests.nothingActive')}
          </Text>
        ) : (
          instances.active.map(renderQuest)
        )}
      </View>

      {instances.completed.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text variant="caption" tone="muted">
            {t('quests.completed')}
          </Text>
          {instances.completed.map(renderQuest)}
        </View>
      ) : null}

      {period === 'weekly' ? (
        <Card>
          <CardHeader title={t('quests.nextWeek')} subtitle={t('plan.choose')} />
          <Text variant="caption" tone="muted" tabular>
            {t('quests.weeklySessions')}:{' '}
            {t('unit.of', { done: counters.weekly.done, target: counters.weekly.target })}
          </Text>
          <Link href="/(tabs)/quests/week" asChild>
            <Button label={t('quests.planWeek')} variant="secondary" onPress={() => undefined} />
          </Link>
        </Card>
      ) : null}

      {instances.archived.length > 0 ? (
        <Card>
          <CardHeader title={t('quests.archived')} subtitle={t('quests.recoveryCounts')} />
          {instances.archived.map((instance) => (
            <View key={instance.id} style={{ gap: 2 }}>
              <Text variant="label">
                {t(`quest.${instance.catalogueKey}.title` as 'quest.show_up.title')}
              </Text>
              <Text variant="caption" tone="muted" tabular>
                {t('quests.archivedOn', {
                  date: formatLocalDate(instance.endDate, state.preferences.locale),
                })}
                {' · '}
                {t('quests.archivedIncomplete')}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Link href="/(tabs)/quests/add" asChild>
        <Button label={t('quests.addQuest')} variant="secondary" onPress={() => undefined} />
      </Link>
      <Text variant="caption" tone="muted">
        {t('quests.loggedOnce')}
      </Text>
      <Text variant="caption" tone="muted">
        {t('quests.recoveryCounts')}
      </Text>
    </Screen>
  );
}

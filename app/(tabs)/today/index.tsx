import { Link, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { modalityLabelKey, starterStrengthSession } from '@/core/content';
import { addDays, dayOfWeek, formatLocalDate } from '@/core/dates';
import type { ActivityEvent, Modality, QuestInstance } from '@/core/types';
import { useApp } from '@/state/app-provider';
import {
  dayStates,
  useLevelProgress,
  useMood,
  usePeriodCounters,
  useToday,
  useWeeklySummary,
} from '@/state/hooks';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { CompanionSprite, PixelIcon } from '@/ui/pixel-sprite';
import { ProgressBar } from '@/ui/progress-bar';
import { Headline, Screen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { unitLabelKey } from '@/ui/units';

/**
 * Today answers one question: what now? One main action, up to two optional
 * habits, and a short look at the week — never unrelated health statistics.
 */

export default function TodayScreen() {
  const { store, state, theme, t } = useApp();
  const router = useRouter();
  const now = new Date().toISOString();
  const today = useToday(now);
  const progress = useLevelProgress();
  const mood = useMood(now);
  const week = useWeeklySummary(now);
  const counters = usePeriodCounters(now);

  const recent = [...state.activityEvents]
    .filter((event) => event.deletedAt === null)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, 3);
  const weekStrip = dayStates(state, week.weekStart, addDays(week.weekStart, 6));
  const supporting = state.questInstances.filter(
    (instance) =>
      instance.periodKind === 'daily' &&
      instance.kind === 'supporting' &&
      instance.startDate === today.today,
  );

  const startSession = (scheduledSessionId: string | null, modality: Modality) => {
    const sessionId = store.startWorkout(
      {
        scheduledSessionId,
        modality,
        exercises: modality === 'strength' ? starterStrengthSession() : [],
      },
      now,
    );
    if (sessionId) router.push(`/session/${sessionId}`);
  };

  /** A supporting habit is logged at its own target, so one tap means done. */
  const logSupporting = (instance: QuestInstance) => {
    const event: ActivityEvent = {
      id: `act:${instance.id}:${state.activityEvents.length}`,
      kind: instance.activityKinds[0] ?? 'mobility',
      measure: instance.measure,
      quantity: instance.target,
      occurredAt: now,
      localDate: today.today,
      timeZone: state.preferences.timeZone,
      source: 'manual',
      sourceId: instance.id,
      revision: 1,
      deletedAt: null,
      note: '',
    };
    store.logActivity(event, now);
  };

  const moodLabel = t(`mood.${mood.mood}` as 'mood.ready');
  const interval = progress.isMaxLevel ? 1 : progress.xpForNextLevel;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="pixel" tone="muted">
          {t('app.name')}
        </Text>
        <Text variant="caption" tone="muted" tabular>
          {t('xp.lifetime', { count: progress.totalXp })}
        </Text>
      </View>

      <Headline subtitle={t('today.savedLocally')}>{t('today.headline')}</Headline>

      <Card>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <CompanionSprite
            level={progress.level}
            mood={mood.mood}
            appearance={state.preferences.appearance}
            theme={theme}
            scale={4}
            label={t('a11y.avatar', { level: progress.level, mood: moodLabel })}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <Text variant="title" tabular>
              {t('today.level', { level: progress.level })}
            </Text>
            <ProgressBar
              value={progress.xpIntoLevel}
              max={interval}
              complete={progress.isMaxLevel}
              label={t('a11y.levelBar')}
            />
            <Text variant="label" tone="muted" tabular>
              {progress.isMaxLevel
                ? t('level.maxReached')
                : t('level.progress', { current: progress.xpIntoLevel, total: interval })}
            </Text>
            <Text variant="caption" tone="muted">
              {t('today.mood', { mood: moodLabel })}
            </Text>
          </View>
        </View>
      </Card>

      <Card accentRail>
        <CardHeader
          title={t('today.mondaysPlan')}
          subtitle={formatLocalDate(today.today, state.preferences.locale)}
        />
        {today.sessions.length > 0 ? (
          today.sessions.map((session) => {
            const done = session.status === 'completed' || session.status === 'shortened';
            const active = session.status === 'in_progress';
            return (
              <View key={session.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <PixelIcon
                    name={done ? 'check' : 'dumbbell'}
                    size={14}
                    color={done ? theme.tokens.successText : theme.tokens.textMuted}
                  />
                  <Text variant="label" style={{ flex: 1 }}>
                    {t(session.titleKey as 'plan.strengthSession')}
                  </Text>
                  {done ? (
                    <Text variant="caption" tone="success">
                      {t('quests.completed')}
                    </Text>
                  ) : null}
                </View>
                {!done ? (
                  <Button
                    label={active ? t('today.continueWorkout') : t('today.startWorkout')}
                    onPress={() => startSession(session.id, session.modality)}
                  />
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={{ gap: 8 }}>
            <Text variant="label">{today.isRecovery ? t('plan.recovery') : t('plan.none')}</Text>
            <Text variant="caption" tone="muted">
              {today.isRecovery ? t('mood.recoveryNote') : t('plan.noneHint')}
            </Text>
          </View>
        )}
        <Link href="/(tabs)/quests/week" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={t('today.adjustPlan')}>
            <Text variant="label" tone="primary">
              {t('today.adjustPlan')}
            </Text>
          </Pressable>
        </Link>
      </Card>

      {supporting.length > 0 ? (
        <Card>
          <CardHeader title={t('quests.supporting')} subtitle={t('quests.supportingCap')} />
          {supporting.map((instance) => (
            <View key={instance.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="label">
                  {t(`quest.${instance.catalogueKey}.title` as 'quest.keep_moving.title')}
                </Text>
                <Text variant="caption" tone="muted" tabular>
                  {t('unit.of', { done: instance.progress, target: instance.target })}{' '}
                  {t(unitLabelKey(instance.measure), { count: instance.target })}
                </Text>
              </View>
              {instance.status === 'completed' ? (
                <PixelIcon name="check" size={16} color={theme.tokens.successText} />
              ) : (
                <Button
                  label={t('today.logSomething')}
                  variant="secondary"
                  onPress={() => logSupporting(instance)}
                />
              )}
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={t('plan.thisWeek')}
          subtitle={
            counters.weekly.target > 0
              ? t('unit.of', { done: counters.weekly.done, target: counters.weekly.target })
              : t('plan.none')
          }
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {weekStrip.map((day) => (
            <View key={day.date} style={{ alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: day.completed
                    ? theme.tokens.successSurface
                    : day.planned
                      ? theme.tokens.progressTrack
                      : 'transparent',
                  borderWidth: day.planned || day.recovery ? 0 : 1,
                  borderColor: theme.tokens.progressTrack,
                }}
              >
                {day.completed ? (
                  <PixelIcon name="check" size={14} color={theme.tokens.successText} />
                ) : day.recovery ? (
                  <PixelIcon name="flame" size={12} color={theme.tokens.textMuted} />
                ) : null}
              </View>
              <Text variant="caption" tone="muted">
                {t(`weekday.${dayOfWeek(day.date)}` as 'weekday.1')}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <CardHeader title={t('today.recent')} />
        {recent.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('today.noActivity')}
          </Text>
        ) : (
          recent.map((event) => (
            <View key={event.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PixelIcon
                name={event.kind === 'strength' ? 'dumbbell' : 'chart'}
                size={14}
                color={theme.tokens.textMuted}
              />
              <Text variant="label" style={{ flex: 1 }}>
                {t(modalityLabelKey(event.kind === 'strength' ? 'strength' : 'walk') as 'modality.walk')}
              </Text>
              <Text variant="caption" tone="muted" tabular>
                {formatLocalDate(event.localDate, state.preferences.locale, {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
          ))
        )}
        <Link href="/(tabs)/today/history" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={t('today.seeHistory')}>
            <Text variant="label" tone="primary">
              {t('today.seeHistory')}
            </Text>
          </Pressable>
        </Link>
      </Card>
    </Screen>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { exerciseById, modalityLabelKey } from '@/core/content';
import { formatDuration } from '@/core/dates';
import type { SetLog } from '@/core/types';
import { useApp } from '@/state/app-provider';
import { usePendingCelebration, usePeriodCounters } from '@/state/hooks';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { Stepper } from '@/ui/controls';
import { PixelIcon } from '@/ui/pixel-sprite';
import { ProgressBar } from '@/ui/progress-bar';
import { EmptyState, Screen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { unitLabelKey } from '@/ui/units';

const REST_SECONDS = 90;

/**
 * A live session.
 *
 * Elapsed time is derived from the stored start timestamp instead of a counter,
 * so closing the app, a reboot or a lost connection cannot lose the record. The
 * rest timer is derived the same way while the screen is open.
 */

export default function SessionScreen() {
  const { store, state, theme, t } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = new Date().toISOString();

  const session = state.workoutSessions.find((candidate) => candidate.id === id);
  const { tokens } = theme;
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [showShorten, setShowShorten] = useState(false);
  const [shortenMinutes, setShortenMinutes] = useState(15);
  const [cardioMinutes, setCardioMinutes] = useState(30);
  const [cardioDistance, setCardioDistance] = useState(0);
  const [cardioEffort, setCardioEffort] = useState(0);
  const [, setTick] = useState(0);

  // A single second-resolution tick keeps both timers honest without storing a
  // counter anywhere.
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1_000);
    return () => clearInterval(timer);
  }, []);

  const celebration = usePendingCelebration(now);
  const counters = usePeriodCounters(now);

  const setLogs = useMemo(
    () => state.setLogs.filter((log) => log.sessionId === id),
    [state.setLogs, id],
  );

  if (!session) {
    return (
      <Screen>
        <EmptyState
          title={t('session.noExercises')}
          body={t('common.tryAgain')}
          action={<Button label={t('common.close')} onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  if (session.status === 'completed') {
    return (
      <Screen>
        <View style={{ gap: 8 }}>
          <Text variant="display">{t('complete.title')}</Text>
          <Text variant="body" tone="muted">
            {t('complete.subtitle')}
          </Text>
        </View>

        <Card>
          <Text variant="title" tabular>
            +{celebration.totalXp} XP
          </Text>
          {celebration.bonusXp > 0 ? (
            <Text variant="label" tone="success">
              {t('complete.bonus')} +{celebration.bonusXp}
            </Text>
          ) : null}
        </Card>

        <Card>
          <CardHeader title={t('complete.yourQuests')} />
          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Text variant="caption" tone="muted">
                {t('quests.weeklySessions')}
              </Text>
              <ProgressBar
                value={counters.weekly.done}
                max={counters.weekly.target}
                complete={counters.weekly.target > 0 && counters.weekly.done >= counters.weekly.target}
                label={t('quests.weeklySessions')}
              />
              <Text variant="caption" tabular>
                {t('unit.of', { done: counters.weekly.done, target: counters.weekly.target })}
              </Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text variant="caption" tone="muted">
                {t('quests.monthlySessions')}
              </Text>
              <ProgressBar
                value={counters.monthly.done}
                max={counters.monthly.target}
                complete={counters.monthly.target > 0 && counters.monthly.done >= counters.monthly.target}
                label={t('quests.monthlySessions')}
              />
              <Text variant="caption" tabular>
                {t('unit.of', { done: counters.monthly.done, target: counters.monthly.target })}
              </Text>
            </View>
          </View>
          <Text variant="caption" tone="muted">
            {t('quests.loggedOnce')}
          </Text>
        </Card>

        <Button
          label={t('complete.done')}
          onPress={() => {
            for (const instance of celebration.instances) store.acknowledge(instance.id);
            router.back();
          }}
        />
      </Screen>
    );
  }

  const elapsedSeconds = Math.max(0, Math.round((Date.parse(now) - Date.parse(session.startedAt)) / 1000));
  const restRemaining = restEndsAt ? Math.max(0, Math.round((restEndsAt - Date.now()) / 1000)) : 0;

  const nextSet = session.exercises
    .flatMap((exercise, exerciseIndex) =>
      Array.from({ length: exercise.sets }, (_, setIndex) => ({
        exercise,
        exerciseIndex,
        setIndex,
      })),
    )
    .find(
      (candidate) =>
        !setLogs.some(
          (log) =>
            log.exerciseId === candidate.exercise.exerciseId &&
            log.setIndex === candidate.setIndex &&
            log.completed,
        ),
    );

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Text variant="display" tabular>
          {formatDuration(elapsedSeconds)}
        </Text>
        <Text variant="caption" tone="muted">
          {t('session.elapsed')} · {t('today.savedLocally')}
        </Text>
      </View>

      {session.exercises.length === 0 ? (
        <Card>
          <CardHeader
            title={t('session.cardioTitle')}
            subtitle={t(modalityLabelKey(session.modality) as 'modality.walk')}
          />
          <View style={{ gap: 6 }}>
            <Text variant="label">{t('session.duration')}</Text>
            <Stepper
              label={t('session.duration')}
              value={cardioMinutes}
              step={5}
              min={5}
              max={300}
              onChange={setCardioMinutes}
              format={(value) => `${value} min`}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text variant="label">{t('session.distance')}</Text>
            <Stepper
              label={t('session.distance')}
              value={cardioDistance}
              step={1}
              min={0}
              max={500}
              onChange={setCardioDistance}
              format={(value) =>
                value === 0
                  ? t('common.optional')
                  : `${value} ${state.preferences.distanceUnit === 'km' ? t('unit.kilometres', { count: 1 }) : t('unit.miles', { count: 1 })}`
              }
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text variant="label">{t('session.effort')}</Text>
            <Stepper
              label={t('session.effort')}
              value={cardioEffort}
              min={0}
              max={10}
              onChange={setCardioEffort}
              format={(value) => (value === 0 ? t('common.optional') : `${value}/10`)}
            />
          </View>
          <Button
            label={t('session.saveSession')}
            onPress={() => {
              store.logCardio({
                sessionId: session.id,
                modality: session.modality,
                durationSec: cardioMinutes * 60,
                distanceKm: cardioDistance > 0 ? cardioDistance : null,
                effort: cardioEffort > 0 ? cardioEffort : null,
              });
              store.completeWorkout(session.id, new Date().toISOString());
            }}
          />
          <Text variant="caption" tone="muted">
            {t('today.savedLocally')}
          </Text>
        </Card>
      ) : (
        session.exercises.map((exercise) => (
          <Card key={exercise.exerciseId}>
            <CardHeader
              title={t(exerciseById(exercise.exerciseId)?.nameKey as 'exercise.goblet_squat')}
              subtitle={t(unitLabelKey('sessions'), { count: exercise.sets })}
            />
            {Array.from({ length: exercise.sets }).map((_, setIndex) => {
              const log = setLogs.find(
                (candidate) =>
                  candidate.exerciseId === exercise.exerciseId && candidate.setIndex === setIndex,
              );
              return (
                <SetRow
                  key={setIndex}
                  index={setIndex}
                  log={log}
                  defaultReps={exercise.reps}
                  defaultLoadKg={exercise.loadKg}
                  loadUnit={state.preferences.loadUnit}
                  onToggle={(reps, loadKg, completed) => {
                    store.logSet(
                      {
                        sessionId: session.id,
                        exerciseId: exercise.exerciseId,
                        setIndex,
                        reps,
                        loadKg,
                        completed,
                      },
                      new Date().toISOString(),
                    );
                    if (completed) setRestEndsAt(Date.now() + REST_SECONDS * 1_000);
                  }}
                />
              );
            })}
          </Card>
        ))
      )}

      <Card>
        <CardHeader title={t('session.rest')} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PixelIcon name="clock" size={18} color={tokens.textMuted} />
          <Text variant="title" tabular>
            {formatDuration(restRemaining)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <Button
            label={restEndsAt ? t('session.pause') : t('session.rest')}
            variant="secondary"
            onPress={() => setRestEndsAt(restEndsAt ? null : Date.now() + REST_SECONDS * 1_000)}
          />
          <Button
            label={t('session.addTime')}
            variant="secondary"
            onPress={() => setRestEndsAt((current) => (current ?? Date.now()) + 15_000)}
          />
          <Button label={t('session.skipRest')} variant="ghost" onPress={() => setRestEndsAt(null)} />
        </View>
      </Card>

      {nextSet ? (
        <Card>
          <CardHeader title={t('session.upNext')} />
          <Text variant="label">
            {t(exerciseById(nextSet.exercise.exerciseId)?.nameKey as 'exercise.goblet_squat')}
          </Text>
          <Text variant="caption" tone="muted">
            {t(unitLabelKey('sessions'), { count: nextSet.exercise.sets })} ·{' '}
            {nextSet.exercise.reps} reps
          </Text>
        </Card>
      ) : null}

      {showShorten ? (
        <Card>
          <CardHeader title={t('session.shortenedConfirm')} subtitle={t('session.shortenedBody')} />
          <Stepper
            label={t('session.minutes')}
            value={shortenMinutes}
            step={5}
            min={5}
            max={120}
            onChange={setShortenMinutes}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button label={t('common.cancel')} variant="secondary" onPress={() => setShowShorten(false)} />
            <Button
              label={t('session.shortenedConfirm')}
              onPress={() => {
                if (session.scheduledSessionId) {
                  store.shortenSession(
                    session.scheduledSessionId,
                    shortenMinutes,
                    new Date().toISOString(),
                  );
                }
                store.completeWorkout(session.id, new Date().toISOString());
                setShowShorten(false);
              }}
            />
          </View>
        </Card>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('session.shortened')}
          onPress={() => setShowShorten(true)}
        >
          <Text variant="label" tone="primary">
            {t('session.shortened')}
          </Text>
        </Pressable>
      )}

      <Button
        label={t('session.finish')}
        onPress={() => store.completeWorkout(session.id, new Date().toISOString())}
      />
    </Screen>
  );
}

function SetRow({
  index,
  log,
  defaultReps,
  defaultLoadKg,
  loadUnit,
  onToggle,
}: {
  index: number;
  log: SetLog | undefined;
  defaultReps: number;
  defaultLoadKg: number | null;
  loadUnit: 'kg' | 'lb';
  onToggle: (reps: number, loadKg: number | null, completed: boolean) => void;
}) {
  const { theme, t } = useApp();
  const { tokens } = theme;
  const [reps, setReps] = useState(log?.reps ?? defaultReps);
  const [loadKg, setLoadKg] = useState<number | null>(log?.loadKg ?? defaultLoadKg);
  const completed = log?.completed ?? false;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text variant="label" tone="muted" tabular style={{ width: 24 }}>
        {index + 1}
      </Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" tone="muted">
          {loadUnit === 'kg' ? t('unit.kilograms') : t('unit.pounds')}
        </Text>
        <Stepper
          label={t('session.kg')}
          value={loadKg ?? 0}
          step={1}
          min={0}
          max={500}
          onChange={(value) => setLoadKg(value)}
          format={(value) => (value === 0 ? t('session.bodyweight') : String(value))}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" tone="muted">
          {t('session.reps')}
        </Text>
        <Stepper label={t('session.reps')} value={reps} min={1} max={100} onChange={setReps} />
      </View>
      <Pressable
        onPress={() => onToggle(reps, loadKg, !completed)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`${t('session.done')} ${index + 1}`}
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: completed ? tokens.primary : tokens.progressTrack,
          borderRadius: 10,
        }}
      >
        {completed ? <PixelIcon name="check" size={16} color={tokens.primary} /> : null}
      </Pressable>
    </View>
  );
}

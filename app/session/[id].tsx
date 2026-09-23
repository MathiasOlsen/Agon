import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { describeComponent, exerciseById, modalityLabelKey, sessionIsComplete } from '@/core/content';
import { formatDuration } from '@/core/dates';
import type { SetLog } from '@/core/types';
import { PIXEL } from '@/theme/tokens';
import { useApp } from '@/state/app-provider';
import { usePendingCelebration, usePeriodCounters } from '@/state/hooks';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { Stepper } from '@/ui/controls';
import { PixelIcon } from '@/ui/pixel-sprite';
import { ProgressBar } from '@/ui/progress-bar';
import { EmptyState, Screen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { unitLabelKey, unitNameKey } from '@/ui/units';

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
  const [restHeld, setRestHeld] = useState<number | null>(null);
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

  // A rest that has run out clears itself, so the card never sits at 00:00
  // pretending something is still counting down.
  useEffect(() => {
    if (restEndsAt === null) return;
    const remainingMs = restEndsAt - Date.now();
    if (remainingMs <= 0) {
      setRestEndsAt(null);
      return;
    }
    const timeout = setTimeout(() => setRestEndsAt(null), remainingMs);
    return () => clearTimeout(timeout);
  }, [restEndsAt]);

  const celebration = usePendingCelebration(now);
  const counters = usePeriodCounters(now);

  const setLogs = useMemo(
    () => state.setLogs.filter((log) => log.sessionId === id),
    [state.setLogs, id],
  );

  // A session is strict: every set of every component, or it is not finished.
  const allSetsDone = useMemo(
    () => sessionIsComplete(session?.exercises ?? [], setLogs),
    [session?.exercises, setLogs],
  );
  const completionFired = useRef(false);

  useEffect(() => {
    if (!session || session.status !== 'in_progress' || !allSetsDone) return;
    if (completionFired.current) return;
    completionFired.current = true;
    store.completeWorkout(session.id, new Date().toISOString());
  }, [allSetsDone, session, store]);

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
          <Text variant="title" tabular>{`+${celebration.totalXp} XP`}</Text>
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
  const restState: 'idle' | 'running' | 'paused' =
    restEndsAt !== null ? 'running' : restHeld !== null && restHeld > 0 ? 'paused' : 'idle';

  const startRest = () => {
    setRestHeld(null);
    setRestEndsAt(Date.now() + REST_SECONDS * 1_000);
  };
  const holdRest = () => {
    if (restEndsAt !== null) {
      // Round up, so holding the rest never quietly takes a second away.
      setRestHeld(Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1_000)));
      setRestEndsAt(null);
    } else if (restHeld !== null) {
      setRestEndsAt(Date.now() + restHeld * 1_000);
      setRestHeld(null);
    }
  };
  const addRestTime = () => {
    if (restEndsAt !== null) setRestEndsAt(restEndsAt + 15_000);
    else setRestHeld((current) => (current ?? 0) + 15);
  };
  const stopRest = () => {
    setRestEndsAt(null);
    setRestHeld(null);
  };

  // A rest is something the person starts, between sets, when they are ready
  // for it. So the card sits with the exercise they are on rather than at the
  // bottom of the page, and nothing counts down until they say so.
  const restCard = (
    <Card>
      <CardHeader
        title={t('session.rest')}
        subtitle={
          restState === 'running'
            ? t('session.restRunning')
            : restState === 'paused'
              ? t('session.restPaused')
              : t('session.restNotRunning')
        }
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PixelIcon name="clock" size={18} color={tokens.textMuted} />
        <Text variant="title" tabular>
          {formatDuration(
            restState === 'running'
              ? restRemaining
              : restState === 'paused'
                ? (restHeld ?? 0)
                : REST_SECONDS,
          )}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        {restState === 'idle' ? (
          <Button label={t('session.startRest')} variant="secondary" onPress={startRest} />
        ) : (
          <>
            <Button
              label={restState === 'running' ? t('session.pause') : t('session.resume')}
              variant="secondary"
              onPress={holdRest}
            />
            <Button label={t('session.addTime')} variant="secondary" onPress={addRestTime} />
            <Button label={t('session.skipRest')} variant="ghost" onPress={stopRest} />
          </>
        )}
      </View>
      {restState === 'idle' ? (
        <Text variant="caption" tone="muted">
          {t('session.restHint')}
        </Text>
      ) : null}
    </Card>
  );

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
          session.exercises.map((exercise, exerciseIndex) => {
            const amount = describeComponent(exercise);
            const name = t(
              (exerciseById(exercise.exerciseId)?.nameKey ?? 'exercise.unknown') as 'exercise.unknown',
            );
            const alternative = exercise.alternativeExerciseId
              ? t(
                  (exerciseById(exercise.alternativeExerciseId)?.nameKey ??
                    'exercise.unknown') as 'exercise.unknown',
                )
              : null;
            const hint = exerciseById(exercise.exerciseId)?.hintKey;
            return (
            <Fragment key={`${exercise.exerciseId}-${exerciseIndex}`}>
            <Card>
              <CardHeader
                title={name}
                subtitle={
                  amount.amount === 'reps' && amount.value !== null
                    ? `${t('unit.sets', { count: amount.sets })} × ${t('unit.reps', { count: amount.value })}`
                    : amount.amount === 'seconds' && amount.value !== null
                      ? `${t('unit.sets', { count: amount.sets })} × ${t('unit.seconds', { count: amount.value })}`
                      : t('unit.sets', { count: amount.sets })
                }
              />
              {hint ? (
                <Text variant="caption" tone="muted">
                  {t(hint as 'exercise.push_up.hint')}
                </Text>
              ) : null}
              {alternative ? (
                <Text variant="caption" tone="primary">
                  {t('session.instead', { name: alternative })}
                </Text>
              ) : null}
              {exercise.tool !== 'none' ? (
                <Text variant="caption" tone="muted">
                  {t('session.uses', { tool: t(`tool.${exercise.tool}` as 'tool.dumbbell') })}
                </Text>
              ) : null}
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
                    defaultAmount={amount.value ?? 0}
                    amountLabel={
                      amount.amount === 'seconds' ? t('session.hold') : t('session.reps')
                    }
                    showLoad={exercise.loadKg !== null || exercise.tool !== 'none'}
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
                  }}
                  />
                );
              })}
            </Card>
            {exerciseIndex === nextSet?.exerciseIndex ? restCard : null}
            </Fragment>
            );
          })
      )}

      {nextSet ? (
        <Card>
          <CardHeader title={t('session.upNext')} />
          <Text variant="label">
            {t(exerciseById(nextSet.exercise.exerciseId)?.nameKey as 'exercise.goblet_squat')}
          </Text>
          <Text variant="caption" tone="muted">
            {nextSet.exercise.durationSec !== null
              ? `${t('unit.sets', { count: nextSet.exercise.sets })} × ${t('unit.seconds', {
                  count: nextSet.exercise.durationSec,
                })}`
              : `${t('unit.sets', { count: nextSet.exercise.sets })} × ${t('unit.reps', {
                  count: nextSet.exercise.reps ?? 0,
                })}`}
          </Text>
        </Card>
      ) : null}

        {allSetsDone ? null : (
          <Text variant="caption" tone="muted">
            {t('session.strict')}
          </Text>
        )}

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
        ) : allSetsDone ? null : (
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

        {allSetsDone ? (
          <Button
            label={t('session.finish')}
            onPress={() => store.completeWorkout(session.id, new Date().toISOString())}
          />
        ) : (
          <Button
            label={t('session.finishEarly')}
            variant="secondary"
            onPress={() => setShowShorten(true)}
          />
        )}
    </Screen>
  );
}

  function SetRow({
    index,
    log,
    defaultAmount,
    amountLabel,
    showLoad,
    defaultLoadKg,
    loadUnit,
    onToggle,
  }: {
    index: number;
    log: SetLog | undefined;
    defaultAmount: number;
    amountLabel: string;
    showLoad: boolean;
    defaultLoadKg: number | null;
    loadUnit: 'kg' | 'lb';
    onToggle: (reps: number, loadKg: number | null, completed: boolean) => void;
  }) {
    const { theme, t } = useApp();
    const { tokens } = theme;
    const [amount, setAmount] = useState(log?.reps ?? defaultAmount);
    const [loadKg, setLoadKg] = useState<number | null>(log?.loadKg ?? defaultLoadKg);
    const completed = log?.completed ?? false;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text variant="label" tone="muted" tabular style={{ width: 24 }}>
        {index + 1}
      </Text>
        {showLoad ? (
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
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" tone="muted">
            {amountLabel}
          </Text>
          <Stepper
            label={amountLabel}
            value={amount}
            step={amount > 60 ? 10 : 1}
            min={1}
            max={600}
            onChange={setAmount}
          />
        </View>
        <Pressable
          onPress={() => onToggle(amount, loadKg, !completed)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        aria-checked={completed}
        accessibilityLabel={`${t('session.done')} ${index + 1}`}
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: completed ? tokens.primary : tokens.progressTrack,
          borderRadius: PIXEL.corner,
        }}
      >
        {completed ? <PixelIcon name="check" size={16} color={tokens.primary} /> : null}
      </Pressable>
    </View>
  );
}

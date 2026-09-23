import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STARTER_BUNDLES, bundleByKey, sessionIsComplete } from './content';
import { planSlotsFromDraft } from './plan';
import {
  completeWorkout,
  enableCatalogueEntry,
  instanceIdFor,
  logActivity,
  logSet,
  recompute,
  scheduledSessionIdFor,
  scheduledSessionsForDate,
  startWorkout,
} from './engine';
import {
  TEST_NOW,
  TEST_TODAY,
  instanceById,
  makeActivityEvent,
  makeState,
  rewardTotal,
} from './test-support';

/**
 * Bundles are the weekly workouts: a named set of components, each with sets,
 * reps or a hold, a load and a tool. Sets are the unit of completion and a
 * session is strict, so these tests pin down what "done" means.
 */

test('every starter bundle opens with a warm-up and offers a way out of every tool', () => {
  for (const bundle of STARTER_BUNDLES) {
    assert.equal(
      bundle.exercises[0]?.exerciseId,
      'warmup',
      `${bundle.key} should start with a warm-up`,
    );
    for (const exercise of bundle.exercises) {
      assert.ok(
        exercise.reps !== null || exercise.durationSec !== null,
        `${bundle.key}:${exercise.exerciseId} needs reps or a duration`,
      );
      assert.ok(
        !(exercise.reps !== null && exercise.durationSec !== null),
        `${bundle.key}:${exercise.exerciseId} is either reps or time, not both`,
      );
      if (exercise.tool !== 'none') {
        assert.ok(
          exercise.alternativeExerciseId,
          `${bundle.key}:${exercise.exerciseId} needs a bodyweight alternative`,
        );
      }
    }
  }
});

test('a session is strict: every set of every component', () => {
  const bundle = bundleByKey('strength_a');
  assert.ok(bundle);
  const sets = bundle.exercises.flatMap((exercise) =>
    Array.from({ length: exercise.sets }, (_, setIndex) => ({
      exerciseId: exercise.exerciseId,
      setIndex,
      completed: true,
    })),
  );
  assert.equal(sessionIsComplete(bundle.exercises, sets), true);

  const missing = sets.slice(0, -1);
  assert.equal(
    sessionIsComplete(bundle.exercises, missing),
    false,
    'one unticked set leaves the session unfinished',
  );
  const unticked = sets.map((entry, index) =>
    index === 2 ? { ...entry, completed: false } : entry,
  );
  assert.equal(sessionIsComplete(bundle.exercises, unticked), false);
});

test('three strength days rotate through three different bundles', () => {
  const slots = planSlotsFromDraft(
    { strengthDays: [1, 3, 5], cardioDays: [], recoveryDays: [], mobilityDays: [] },
    (seed) => `slot:${seed}`,
  );
  assert.deepEqual(
    slots.map((slot) => slot.titleKey),
    ['bundle.strength_a', 'bundle.legs_core', 'bundle.strength_b'],
    'Monday, Wednesday and Friday are not the same session',
  );
});

test('ticking every set completes the session and the weekly bundle', () => {
  let state = recompute(makeState(), TEST_NOW).state;
  state = enableCatalogueEntry(state, 'strength_workout', true, null, TEST_NOW).state;

  const bundle = bundleByKey('strength_a');
  assert.ok(bundle);
  const scheduledId = scheduledSessionIdFor(TEST_TODAY, 'strength');
  const started = startWorkout(state, {
    scheduledSessionId: scheduledId,
    modality: 'strength',
    exercises: bundle.exercises.map((exercise) => ({ ...exercise })),
    startedAt: TEST_NOW,
  });
  const sessionId = started.state.workoutSessions[0]?.id ?? '';
  assert.ok(sessionId);

  let working = started.state;
  for (const exercise of bundle.exercises) {
    for (let setIndex = 0; setIndex < exercise.sets; setIndex += 1) {
      working = logSet(working, {
        sessionId,
        exerciseId: exercise.exerciseId,
        setIndex,
        reps: exercise.reps ?? exercise.durationSec ?? 1,
        loadKg: exercise.loadKg,
        completed: true,
        recordedAt: TEST_NOW,
      }).state;
    }
  }

  const finished = completeWorkout(working, sessionId, '2026-09-21T08:40:00.000Z');
  assert.equal(
    scheduledSessionsForDate(finished.state, TEST_TODAY)[0]?.status,
    'completed',
    'the plan entry closes when the bundle is done',
  );
  assert.equal(
    instanceById(finished.state, instanceIdFor('strength_workout', '2026-09-21'))?.status,
    'completed',
    'and the weekly bundle quest ticks with it',
  );
  assert.equal(rewardTotal(finished.state), 200 + 50 + 600);
});

test('a session you write yourself completes the day just the same', () => {
  let state = recompute(makeState(), TEST_NOW).state;
  state = enableCatalogueEntry(state, 'strength_workout', true, null, TEST_NOW).state;

  const started = startWorkout(state, {
    scheduledSessionId: scheduledSessionIdFor(TEST_TODAY, 'strength'),
    modality: 'strength',
    exercises: [
      {
        exerciseId: 'push_up',
        sets: 4,
        reps: 12,
        durationSec: null,
        loadKg: null,
        tool: 'none',
        alternativeExerciseId: 'knee_push_up',
      },
    ],
    startedAt: TEST_NOW,
  });
  const sessionId = started.state.workoutSessions[0]?.id ?? '';
  const logged = logSet(started.state, {
    sessionId,
    exerciseId: 'push_up',
    setIndex: 0,
    reps: 12,
    loadKg: null,
    completed: true,
    recordedAt: TEST_NOW,
  }).state;

  const finished = completeWorkout(logged, sessionId, '2026-09-21T08:20:00.000Z');
  assert.equal(scheduledSessionsForDate(finished.state, TEST_TODAY)[0]?.status, 'completed');
  assert.equal(
    instanceById(finished.state, instanceIdFor('strength_workout', '2026-09-21'))?.status,
    'completed',
    'a self-written session is not second class',
  );
});

test('micro-quests complete in reps and in seconds', () => {
  let state = recompute(makeState(), TEST_NOW).state;
  state = enableCatalogueEntry(state, 'ten_push_ups', true, null, TEST_NOW).state;
  state = enableCatalogueEntry(state, 'one_minute_plank', true, null, TEST_NOW).state;

  state = logActivity(
    state,
    makeActivityEvent({
      localDate: TEST_TODAY,
      kind: 'strength',
      measure: 'reps',
      quantity: 10,
      id: 'act:micro:pushups',
    }),
    TEST_NOW,
  ).state;
  assert.equal(
    instanceById(state, instanceIdFor('ten_push_ups', TEST_TODAY))?.status,
    'completed',
  );

  state = logActivity(
    state,
    makeActivityEvent({
      localDate: TEST_TODAY,
      kind: 'strength',
      measure: 'seconds',
      quantity: 60,
      id: 'act:micro:plank',
    }),
    TEST_NOW,
  ).state;
  assert.equal(
    instanceById(state, instanceIdFor('one_minute_plank', TEST_TODAY))?.status,
    'completed',
  );
  assert.equal(rewardTotal(state), 100, 'two micro-quests, and the cap holds at two');
});

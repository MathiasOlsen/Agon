import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays } from './dates';
import { plannedMainDaysBetween } from './plan';
import { periodRangeFor } from './periods';
import {
  acknowledge,
  checkoff,
  completeWorkout,
  correctActivity,
  deleteActivity,
  enableCatalogueEntry,
  instanceIdFor,
  isRewardSuppressedForRecognition,
  logActivity,
  logSet,
  moodFor,
  openSessionsForDate,
  recompute,
  rescheduleSession,
  scheduledSessionIdFor,
  scheduledSessionsForDate,
  setPlan,
  shortenSession,
  startWorkout,
  totalXp,
} from './engine';
import { REWARD_TABLE } from './rewards';
import {
  TEST_NOW,
  TEST_TODAY,
  instanceById,
  makeActivityEvent,
  makeModalityEvent,
  makePreferences,
  makeState,
  rewardTotal,
} from './test-support';
import type { AgonState, QuestTemplate } from './types';

/** Every period key must name a period of its own kind: a monthly quest may not
 *  be keyed by a date. Enabling a long-term supporting quest used to break this
 *  and crash the app with "Not a local date: 2026-09-23-01". */
function assertPeriodKeysAreSane(state: AgonState): void {
  for (const instance of state.questInstances) {
    assert.doesNotThrow(
      () => periodRangeFor(instance.periodKind, instance.periodKey, state.preferences.weekStart),
      `${instance.id} is keyed by ${instance.periodKey}`,
    );
  }
}

function withWeeklyGoal(state: AgonState): AgonState {
  return enableCatalogueEntry(state, 'show_up', true, null, TEST_NOW).state;
}

function withSessionLogged(state: AgonState, date = TEST_TODAY): AgonState {
  return logActivity(
    state,
    makeModalityEvent({ localDate: date, modality: 'strength', minutes: 40 }),
    TEST_NOW,
  ).state;
}

test('the plan becomes dated sessions, and running twice changes nothing', () => {
  const first = recompute(makeState(), TEST_NOW);
  assert.ok(scheduledSessionsForDate(first.state, TEST_TODAY).length === 1);
  assert.equal(scheduledSessionsForDate(first.state, TEST_TODAY)[0]?.id, 'ss:2026-09-21:strength');

  const second = recompute(first.state, TEST_NOW);
  assert.equal(second.ops.length, 0, 'a second pass writes nothing');
});

test('daily quests follow the plan for that day', () => {
  const state = recompute(makeState(), TEST_NOW).state;
  assert.ok(instanceById(state, instanceIdFor('build_your_strength', TEST_TODAY)));
  assert.equal(instanceById(state, instanceIdFor('find_your_pace', TEST_TODAY)), undefined);

  // Wednesday is the aerobic day in the fixture plan.
  const wednesday = recompute(state, '2026-09-23T08:00:00.000Z').state;
  assert.ok(instanceById(wednesday, instanceIdFor('find_your_pace', '2026-09-23')));

  // Thursday is recovery: it asks only that the rest is respected.
  const thursday = recompute(state, '2026-09-24T08:00:00.000Z').state;
  assert.ok(instanceById(thursday, instanceIdFor('respect_the_rest', '2026-09-24')));
});

test('completing the planned session earns the quest and the daily bonus once', () => {
  const state = withSessionLogged(withWeeklyGoal(recompute(makeState(), TEST_NOW).state));

  const instance = instanceById(state, instanceIdFor('build_your_strength', TEST_TODAY));
  assert.equal(instance?.status, 'completed');
  assert.equal(instance?.progress, instance?.target, 'a completed bar is exactly full');
  assert.equal(
    rewardTotal(state),
    REWARD_TABLE.daily + REWARD_TABLE.dailyBonus,
    '200 for the quest plus the 50 bonus',
  );

  const again = recompute(state, TEST_NOW);
  assert.equal(again.ops.filter((op) => op.table === 'reward_events').length, 0);
  assert.equal(rewardTotal(again.state), 250, 'repeated passes cannot double a reward');
});

test('a clock rollback neither duplicates nor removes XP', () => {
  const state = withSessionLogged(recompute(makeState(), TEST_NOW).state);
  const rolled = recompute(state, '2026-09-21T06:00:00.000Z');
  assert.equal(rewardTotal(rolled.state), 250);
  assert.equal(rolled.reversedNow.length, 0);
});

test('correcting the record reverses exactly the reward it invalidated', () => {
  const logged = withSessionLogged(recompute(makeState(), TEST_NOW).state);
  const event = logged.activityEvents[0];
  assert.ok(event);

  const corrected = deleteActivity(logged, event.id, TEST_NOW);
  assert.equal(rewardTotal(corrected.state), 0);
  assert.equal(
    corrected.state.rewardEvents.filter((reward) => reward.reversedAt !== null).length,
    2,
    'both the quest reward and the bonus are reversed',
  );
  const instance = instanceById(corrected.state, instanceIdFor('build_your_strength', TEST_TODAY));
  assert.equal(instance?.status, 'not_started');
  assert.equal(instance?.progress, 0);
  assert.equal(
    corrected.state.scheduledSessions.find(
      (session) => session.id === scheduledSessionIdFor(TEST_TODAY, 'strength'),
    )?.status,
    'planned',
    'the session is open again rather than quietly completed',
  );

  // The ledger keeps the history; the total is what changes.
  assert.equal(corrected.state.rewardEvents.length, 2);
});

test('a backdated correction updates the affected period', () => {
  const logged = withSessionLogged(recompute(makeState(), TEST_NOW).state);
  const event = logged.activityEvents[0];
  assert.ok(event);
  const moved = correctActivity(logged, event.id, { localDate: '2026-09-19' }, TEST_NOW);
  assert.equal(rewardTotal(moved.state), 0, 'a Saturday entry cannot complete Mondays quest');
});

test('only two supporting quests are rewarded on the same day', () => {
  let state = recompute(makeState(), TEST_NOW).state;
  state = enableCatalogueEntry(state, 'a_little_reset', true, null, TEST_NOW).state;
  state = enableCatalogueEntry(state, 'keep_moving', true, 6_000, TEST_NOW).state;

  // A third supporting quest stands in for anything a future version adds.
  const extra: QuestTemplate = {
    id: 'qt:zz_extra',
    catalogueKey: 'zz_extra',
    periodKind: 'daily',
    kind: 'supporting',
    measure: 'sessions',
    target: 1,
    xp: REWARD_TABLE.supportingDaily,
    activityKinds: ['movement'],
    accessibleAlternative: null,
    revision: 1,
    active: true,
  };
  const extraInstance: AgonState['questInstances'][number] = {
    id: instanceIdFor('zz_extra', TEST_TODAY),
    templateId: extra.id,
    templateRevision: 1,
    catalogueKey: extra.catalogueKey,
    periodKind: 'daily',
    periodKey: TEST_TODAY,
    startDate: TEST_TODAY,
    endDate: TEST_TODAY,
    kind: 'supporting',
    measure: 'sessions',
    target: 1,
    xp: REWARD_TABLE.supportingDaily,
    activityKinds: ['movement'],
    accessibleAlternative: null,
    status: 'not_started',
    progress: 0,
    completedAt: null,
    celebrationAcknowledged: false,
    createdAt: TEST_NOW,
  };
  state = {
    ...state,
    questTemplates: [...state.questTemplates, extra],
    questInstances: [...state.questInstances, extraInstance],
  };
  state = recompute(state, TEST_NOW).state;

  state = logActivity(
    state,
    makeActivityEvent({
      localDate: TEST_TODAY,
      kind: 'mobility',
      measure: 'minutes',
      quantity: 10,
      id: 'act:test:mobility',
    }),
    TEST_NOW,
  ).state;
  state = logActivity(
    state,
    makeActivityEvent({
      localDate: TEST_TODAY,
      kind: 'movement',
      measure: 'steps',
      quantity: 6_500,
      id: 'act:test:steps',
    }),
    TEST_NOW,
  ).state;
  state = logActivity(
    state,
    makeActivityEvent({
      localDate: TEST_TODAY,
      kind: 'movement',
      measure: 'sessions',
      quantity: 1,
      id: 'act:test:extra',
    }),
    TEST_NOW,
  ).state;

  const supportingRewards = state.rewardEvents.filter(
    (reward) => reward.kind === 'quest_completion' && reward.deltaXp === REWARD_TABLE.supportingDaily,
  );
  assert.equal(supportingRewards.length, 2);

  const suppressed = instanceById(state, instanceIdFor('zz_extra', TEST_TODAY));
  assert.equal(suppressed?.status, 'completed', 'it still counts as done');
  assert.equal(isRewardSuppressedForRecognition(state, suppressed!), true);
  assert.equal(
    state.rewardEvents.some((reward) => reward.instanceId === suppressed?.id),
    false,
    'recognition, not XP multiplication',
  );
});

test('weekly targets come from the plan, not from a universal number', () => {
  const state = withWeeklyGoal(recompute(makeState(), TEST_NOW).state);
  const weekly = instanceById(state, instanceIdFor('show_up', '2026-09-21'));
  assert.equal(weekly?.target, 2, 'the fixture plan has two sessions this week');

  // Adding a Friday session raises the following week's target.
  const changed = setPlan(
    state,
    { strengthDays: [1, 5], cardioDays: [3], recoveryDays: [4], mobilityDays: [] },
    TEST_NOW,
    (seed) => `slot:${seed}`,
  ).state;
  const nextWeek = instanceById(
    recompute(changed, '2026-09-28T08:00:00.000Z').state,
    instanceIdFor('show_up', '2026-09-28'),
  );
  assert.equal(nextWeek?.target, 3);
});

test('a check-off quest completes without inventing exercise', () => {
  const state = enableCatalogueEntry(
    recompute(makeState(), TEST_NOW).state,
    'set_up_next_week',
    true,
    null,
    TEST_NOW,
  ).state;
  const instance = instanceById(state, instanceIdFor('set_up_next_week', '2026-09-21'));
  assert.ok(instance);

  const done = checkoff(state, instance.id, TEST_NOW);
  assert.equal(instanceById(done.state, instance.id)?.status, 'completed');
  assert.equal(rewardTotal(done.state), REWARD_TABLE.supportingDaily);
  assert.equal(
    done.state.activityEvents.filter((event) => event.measure !== 'checkoff').length,
    0,
    'no exercise was recorded for a planning quest',
  );
});

test('acknowledging a reward never grants it twice', () => {
  const state = withSessionLogged(withWeeklyGoal(recompute(makeState(), TEST_NOW).state));
  const instance = instanceById(state, instanceIdFor('build_your_strength', TEST_TODAY));
  assert.ok(instance);
  const acknowledged = acknowledge(state, instance.id);
  assert.equal(
    instanceById(acknowledged.state, instance.id)?.celebrationAcknowledged,
    true,
  );
  assert.equal(rewardTotal(acknowledged.state), 250);
  assert.equal(acknowledge(acknowledged.state, instance.id).ops.length, 0, 'idempotent');
});

test('an expired quest keeps its activity but earns no bonus', () => {
  let state = recompute(makeState(), TEST_NOW).state;
  const monday = instanceById(state, instanceIdFor('build_your_strength', TEST_TODAY));
  assert.ok(monday);

  // Come back a week later without having logged anything.
  state = recompute(state, '2026-09-28T08:00:00.000Z').state;
  const archived = instanceById(state, instanceIdFor('build_your_strength', TEST_TODAY));
  assert.equal(archived?.status, 'archived_incomplete');
  assert.equal(rewardTotal(state), 0);
  assert.equal(
    scheduledSessionsForDate(state, TEST_TODAY)[0]?.status,
    'missed',
    'a missed day is shown honestly and costs no permanent XP',
  );
});

test('finishing a workout writes the record once and closes the plan entry', () => {
  const state = recompute(makeState(), TEST_NOW).state;
  const scheduledId = scheduledSessionIdFor(TEST_TODAY, 'strength');
  const started = startWorkout(state, {
    scheduledSessionId: scheduledId,
    modality: 'strength',
    exercises: [{ exerciseId: 'goblet_squat', sets: 3, reps: 10, loadKg: 16 }],
    startedAt: TEST_NOW,
  });
  const sessionId = started.state.workoutSessions[0]?.id;
  assert.ok(sessionId);

  const withSet = logSet(started.state, {
    sessionId,
    exerciseId: 'goblet_squat',
    setIndex: 0,
    reps: 10,
    loadKg: 16,
    completed: true,
    recordedAt: TEST_NOW,
  });

  const finished = completeWorkout(withSet.state, sessionId, '2026-09-21T08:40:00.000Z');
  assert.equal(finished.state.workoutSessions[0]?.status, 'completed');
  assert.equal(
    scheduledSessionsForDate(finished.state, TEST_TODAY)[0]?.status,
    'completed',
  );
  const events = finished.state.activityEvents.filter((event) => event.sourceId === sessionId);
  assert.equal(events.length, 2, 'one session fact and one duration fact');
  assert.equal(rewardTotal(finished.state), 250);

  // Finishing again is harmless.
  const twice = completeWorkout(finished.state, sessionId, '2026-09-21T08:45:00.000Z');
  assert.equal(
    twice.state.activityEvents.filter((event) => event.sourceId === sessionId).length,
    2,
    'the same session is never recorded twice',
  );
  assert.equal(rewardTotal(twice.state), 250);
});

test('a shortened session replaces the original and cannot pay twice', () => {
  const state = recompute(makeState(), TEST_NOW).state;
  const shortened = shortenSession(state, scheduledSessionIdFor(TEST_TODAY, 'strength'), 15, TEST_NOW);
  const session = shortened.state.scheduledSessions.find((entry) => entry.id === scheduledSessionIdFor(TEST_TODAY, 'strength'));
  assert.equal(session?.status, 'shortened');
  assert.equal(rewardTotal(shortened.state), 250);

  const again = recompute(shortened.state, TEST_NOW);
  assert.equal(rewardTotal(again.state), 250, 'the shortened session is the same quest');
  assert.equal(
    again.state.activityEvents.filter((event) => event.sourceId === session?.id).length,
    1,
  );
});

test('rescheduling keeps the identity and moves the membership', () => {
  const state = recompute(makeState(), TEST_NOW).state;
  const id = scheduledSessionIdFor(TEST_TODAY, 'strength');
  const moved = rescheduleSession(state, id, '2026-09-22', TEST_NOW);
  const session = moved.state.scheduledSessions.find((entry) => entry.id === id);
  assert.equal(session?.id, id, 'the session keeps its identity');
  assert.equal(session?.localDate, '2026-09-22');
  assert.equal(session?.revision, 2);
  assert.equal(session?.rescheduledFrom, TEST_TODAY);
  assert.equal(session?.status, 'rescheduled');
  assert.equal(
    openSessionsForDate(moved.state, TEST_TODAY).length,
    0,
    'no misleading overdue task is left behind',
  );
  assert.equal(rewardTotal(moved.state), 0);
});

test('one activity advances several goals but is stored once', () => {
  let state = recompute(makeState(), TEST_NOW).state;
  state = enableCatalogueEntry(state, 'show_up', true, null, TEST_NOW).state;
  state = enableCatalogueEntry(state, 'strength_foundation', true, null, TEST_NOW).state;
  // One finished session, recorded the way the workout flow records it.
  state = logActivity(
    state,
    makeModalityEvent({ localDate: TEST_TODAY, modality: 'strength' }),
    TEST_NOW,
  ).state;
  state = withSessionLogged(state);

  assert.equal(
    state.activityEvents.filter((event) => event.kind === 'strength').length,
    2,
    'one session fact and one duration fact, not one copy per goal',
  );

  const weekly = instanceById(state, instanceIdFor('show_up', '2026-09-21'));
  const strength = instanceById(state, instanceIdFor('strength_foundation', '2026-09-21'));
  assert.equal(weekly?.progress, 1);
  assert.equal(strength?.progress, 1);
  assert.equal(
    rewardTotal(state),
    200 + 50 + 50,
    'the daily quest, the daily bonus and the single strength day the week asked for',
  );
  assert.equal(
    instanceById(state, instanceIdFor('show_up', '2026-09-21'))?.status,
    'in_progress',
    'the weekly goal still needs its second session',
  );
});

test('mood follows the recorded sessions', () => {
  // A brand-new user has no history at all.
  const fresh = recompute(
    makeState({ preferences: makePreferences({ planStartDate: TEST_TODAY }) }),
    TEST_NOW,
  ).state;
  assert.equal(moodFor(fresh, TEST_NOW, null).mood, 'ready');

  // An established user who completes every planned day in the window.
  let state = recompute(makeState(), TEST_NOW).state;
  const planned = plannedMainDaysBetween(
    state.planSlots,
    // The whole fourteen-day window the mood calculation looks at.
    addDays(TEST_TODAY, -14),
    addDays(TEST_TODAY, -1),
  );
  assert.ok(planned.length >= 3, `expected a few planned days, got ${planned.length}`);
  for (const day of planned) {
    const modality = day.slots[0]?.modality ?? 'strength';
    state = logActivity(
      state,
      makeModalityEvent({ localDate: day.date, modality, minutes: 45 }),
      TEST_NOW,
    ).state;
  }
  const mood = moodFor(state, TEST_NOW, null);
  assert.equal(mood.mood, 'radiant');
  assert.ok(totalXp(state) > 0);
});

test('pausing freezes mood without touching permanent progress', () => {
  let state = withSessionLogged(withWeeklyGoal(recompute(makeState(), TEST_NOW).state));
  const before = totalXp(state);
  state = {
    ...state,
    preferences: { ...state.preferences, pausedFrom: TEST_TODAY, pausedTo: '2026-10-01' },
  };
  state = recompute(state, '2026-09-24T08:00:00.000Z').state;
  assert.equal(totalXp(state), before, 'a pause never removes earned XP');
  assert.equal(recompute(state, '2026-09-24T08:00:00.000Z').ops.length, 0);
});

test('a plan with no sessions asks for nothing', () => {
  const empty = recompute(
    makeState({ planSlots: [] }),
    TEST_NOW,
  );
  assert.equal(empty.state.questInstances.filter((i) => i.periodKind === 'daily').length, 0);
  assert.equal(rewardTotal(empty.state), 0, 'an empty plan never earns a bonus');
});

test('enabling a long-term supporting quest keeps every period key valid', () => {
  let state = recompute(
    makeState({ preferences: makePreferences({ planStartDate: TEST_TODAY }) }),
    TEST_NOW,
  ).state;
  // A monthly and a yearly supporting goal: both used to be keyed by a date.
  for (const key of ['notice_your_progress', 'set_up_next_week', 'a_year_of_movement']) {
    state = enableCatalogueEntry(state, key, true, null, TEST_NOW).state;
    assertPeriodKeysAreSane(state);
  }
  const monthly = state.questInstances.find(
    (instance) => instance.catalogueKey === 'notice_your_progress',
  );
  assert.equal(monthly?.periodKey, '2026-09');
  assert.equal(monthly?.periodKind, 'monthly');
});

test('targets only count the time the person was actually here', () => {
  let state = recompute(
    makeState({ preferences: makePreferences({ planStartDate: TEST_TODAY }) }),
    TEST_NOW,
  ).state;
  state = enableCatalogueEntry(state, 'find_your_rhythm', true, null, TEST_NOW).state;
  state = enableCatalogueEntry(state, 'keep_showing_up', true, null, TEST_NOW).state;
  state = recompute(state, TEST_NOW).state;

  // The fixture plan starts on Monday 21 September, so this month asks for four
  // sessions (21, 23, 28 and 30 September), not the twenty-two a full month would.
  const monthly = instanceById(state, instanceIdFor('find_your_rhythm', '2026-09'));
  assert.equal(monthly?.target, 4, 'a month joined mid-way is not a full month of work');

  const plannedFromStart = plannedMainDaysBetween(state.planSlots, TEST_TODAY, '2026-12-31').length;
  const yearly = instanceById(state, instanceIdFor('keep_showing_up', '2026'));
  assert.equal(yearly?.target, Math.max(1, Math.ceil(plannedFromStart * 0.8)));
  assert.ok((yearly?.target ?? 0) < 100, 'a September start is not a 200-session year');
});

test('a plan that starts today does not back-date last week', () => {
  const state = recompute(
    makeState({ preferences: makePreferences({ planStartDate: TEST_TODAY }) }),
    TEST_NOW,
  ).state;
  assert.equal(
    state.questInstances.filter((instance) => instance.status === 'archived_incomplete').length,
    0,
    'nothing should be archived before the person arrived',
  );
});

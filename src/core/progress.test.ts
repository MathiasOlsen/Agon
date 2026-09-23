import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  enableCatalogueEntry,
  instanceIdFor,
  logActivity,
  recompute,
} from './engine';
import { countsSentenceKey, countsShortKey, questBreakdown } from './progress';
import {
  TEST_NOW,
  TEST_TODAY,
  instanceById,
  makeActivityEvent,
  makePreferences,
  makeState,
} from './test-support';

/**
 * The progress view is read-only: it turns the record into what is done, what was
 * missed and what is still to come, so nothing has to be typed into a quest.
 */

test('a plan-based quest lists the scheduled days and marks them honestly', () => {
  let state = recompute(makeState(), TEST_NOW).state;
  state = enableCatalogueEntry(state, 'show_up', true, null, TEST_NOW).state;
  const instance = instanceById(state, instanceIdFor('show_up', '2026-09-21'));
  assert.ok(instance);

  // Today is Monday: Monday is due today, Wednesday is still to come.
  const monday = questBreakdown(state, instance, TEST_TODAY);
  assert.equal(monday.done, 0);
  assert.equal(monday.upcoming, 2);
  assert.deepEqual(
    monday.items.map((item) => item.status),
    ['today', 'upcoming'],
  );
  assert.equal(monday.remaining, 2);

  // Finish the planned strength session and the list says so.
  state = logActivity(
    state,
    makeActivityEvent({
      localDate: TEST_TODAY,
      kind: 'strength',
      measure: 'minutes',
      quantity: 40,
      id: 'act:test:progress-session',
    }),
    TEST_NOW,
  ).state;
  const after = questBreakdown(
    state,
    instanceById(state, instanceIdFor('show_up', '2026-09-21'))!,
    TEST_TODAY,
  );
  assert.equal(after.done, 1);
  assert.equal(after.items[0]?.status, 'done');
  assert.equal(after.remaining, 1);
});

test('a missed day is shown as missed, not quietly dropped', () => {
  let state = recompute(makeState(), TEST_NOW).state;
  state = enableCatalogueEntry(state, 'strength_workout', true, null, TEST_NOW).state;
  const instance = instanceById(state, instanceIdFor('strength_workout', '2026-09-21'));
  assert.ok(instance);

  // Come back on Friday without having done Monday.
  const friday = questBreakdown(state, instance, '2026-09-25');
  assert.equal(friday.missed, 1);
  assert.equal(friday.items[0]?.status, 'missed');
});

test('days before the plan started are not listed as missed', () => {
  // Join on Wednesday: Monday is nobody's missed session, but Wednesday is due.
  const WEDNESDAY = '2026-09-23T08:00:00.000Z';
  let state = recompute(
    makeState({ preferences: makePreferences({ planStartDate: '2026-09-23' }) }),
    WEDNESDAY,
  ).state;
  state = enableCatalogueEntry(state, 'show_up', true, null, WEDNESDAY).state;
  const instance = instanceById(state, instanceIdFor('show_up', '2026-09-21'));
  assert.ok(instance);
  const breakdown = questBreakdown(state, instance, '2026-09-23');
  assert.equal(breakdown.missed, 0, 'nothing was missed before the person arrived');
  assert.deepEqual(
    breakdown.items.map((item) => item.date),
    ['2026-09-23'],
    'only the day that is actually due shows up',
  );
});

test('a quantity quest lists what was logged, newest first', () => {
  let state = recompute(makeState(), TEST_NOW).state;
  state = enableCatalogueEntry(state, 'ten_push_ups', true, null, TEST_NOW).state;
  state = logActivity(
    state,
    makeActivityEvent({
      localDate: TEST_TODAY,
      kind: 'strength',
      measure: 'reps',
      quantity: 10,
      id: 'act:test:reps',
    }),
    TEST_NOW,
  ).state;

  const instance = instanceById(state, instanceIdFor('ten_push_ups', TEST_TODAY));
  assert.ok(instance);
  const breakdown = questBreakdown(state, instance, TEST_TODAY);
  assert.equal(breakdown.items.length, 1);
  assert.equal(breakdown.items[0]?.amount, 10);
  assert.equal(breakdown.done, 1);
  assert.equal(breakdown.remaining, 0);
});

test('a check-off quest has no list to show', () => {
  const state = enableCatalogueEntry(
    recompute(makeState(), TEST_NOW).state,
    'set_up_next_week',
    true,
    null,
    TEST_NOW,
  ).state;
  const instance = instanceById(state, instanceIdFor('set_up_next_week', '2026-09-21'));
  assert.ok(instance);
  const breakdown = questBreakdown(state, instance, TEST_TODAY);
  assert.deepEqual(breakdown.items, []);
  assert.equal(breakdown.remaining, 1);
});

test('every unit explains itself in one sentence', () => {
  const measures = [
    ['ten_push_ups', 'quests.counts.reps'],
    ['one_minute_plank', 'quests.counts.seconds'],
    ['ten_minute_walk', 'quests.counts.minutes'],
    ['show_up', 'quests.counts.sessions'],
    ['set_up_next_week', 'quests.counts.checkoff'],
  ] as const;

  for (const [key, expected] of measures) {
    const state = enableCatalogueEntry(
      recompute(makeState(), TEST_NOW).state,
      key,
      true,
      null,
      TEST_NOW,
    ).state;
    const instance = state.questInstances.find((candidate) => candidate.catalogueKey === key);
    assert.ok(instance, `${key} should have an instance`);
    assert.equal(countsSentenceKey(instance), expected);
    assert.equal(
      countsShortKey(instance),
      expected.replace('quests.counts.', 'quests.counts.short.'),
      'the card gets the short version of the same explanation',
    );
  }
});

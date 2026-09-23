import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays } from './dates';
import { computeMood, scoreForDay, type MoodDay } from './mood';

const TODAY = '2026-09-21';

function day(date: string, completed: number, planned = 1, patch: Partial<MoodDay> = {}): MoodDay {
  return {
    date,
    plannedMain: planned,
    completedMain: completed,
    recovery: false,
    beforeOnboarding: false,
    ...patch,
  };
}

function daysEndingToday(scores: number[]): MoodDay[] {
  // Today is never part of the sample, so the window ends yesterday.
  return scores.map((score, index) =>
    day(addDays(TODAY, index - scores.length), score >= 1 ? 1 : 0, 1, {}),
  );
}

test('a day with no plan contributes nothing', () => {
  assert.equal(scoreForDay(day(TODAY, 0, 0)), 0);
  assert.equal(scoreForDay(day(TODAY, 3, 2)), 1, 'progress is capped at one');
});

test('no eligible history shows Ready and says so', () => {
  const result = computeMood({ today: TODAY, days: [], paused: false, lastMood: null });
  assert.equal(result.mood, 'ready');
  assert.equal(result.mean, null);
  assert.equal(result.carriedOver, true);
});

test('a carried mood survives a quiet stretch', () => {
  const result = computeMood({ today: TODAY, days: [], paused: false, lastMood: 'radiant' });
  assert.equal(result.mood, 'radiant');
  assert.equal(result.carriedOver, true);
});

test('the mean maps onto the five moods', () => {
  assert.equal(computeMood({ today: TODAY, days: daysEndingToday([1, 1, 1]), paused: false, lastMood: null }).mood, 'radiant');
  assert.equal(computeMood({ today: TODAY, days: daysEndingToday([1, 1, 0, 1]), paused: false, lastMood: null }).mood, 'energetic');
  assert.equal(computeMood({ today: TODAY, days: daysEndingToday([1, 0]), paused: false, lastMood: null }).mood, 'ready');
  assert.equal(computeMood({ today: TODAY, days: daysEndingToday([1, 0, 0, 0]), paused: false, lastMood: null }).mood, 'warming');
  assert.equal(computeMood({ today: TODAY, days: daysEndingToday([0, 0, 0, 0, 0]), paused: false, lastMood: null }).mood, 'sleepy');
});

test('only the last seven eligible days count', () => {
  const eight = daysEndingToday([0, 0, 0, 0, 0, 0, 0, 1]);
  const result = computeMood({ today: TODAY, days: eight, paused: false, lastMood: null });
  assert.equal(result.usedDays, 7);
  assert.equal(result.mood, 'sleepy', 'the eighth day back is outside the sample');
});

test('days older than the window are ignored', () => {
  const ancient = [0, 1, 2, 3, 4, 5, 6].map((offset) =>
    day(addDays(TODAY, -20 - offset), 1),
  );
  const result = computeMood({ today: TODAY, days: ancient, paused: false, lastMood: 'ready' });
  assert.equal(result.mean, null);
  assert.equal(result.mood, 'ready');
});

test('recovery and pause freeze the window instead of aging good days out', () => {
  const oldButGood = [8, 9, 10].map((offset) => day(addDays(TODAY, -offset), 1));
  const recoveryDay = day(TODAY, 0, 0, { recovery: true });
  const frozen = computeMood({
    today: TODAY,
    days: [...oldButGood, recoveryDay],
    paused: false,
    lastMood: null,
  });
  assert.equal(frozen.mood, 'radiant');
  assert.equal(frozen.usedDays, 3);

  const paused = computeMood({
    today: TODAY,
    days: oldButGood,
    paused: true,
    lastMood: null,
  });
  assert.equal(paused.mood, 'radiant');
});

test("today can lift the score but never lower it before the day ends", () => {
  const yesterday = day(addDays(TODAY, -1), 1);
  const todayDone = day(TODAY, 1);
  const improved = computeMood({
    today: TODAY,
    days: [yesterday, todayDone],
    paused: false,
    lastMood: null,
  });
  assert.equal(improved.includesToday, true);
  assert.equal(improved.mood, 'radiant', 'two of two days completed');

  const notYet = computeMood({
    today: TODAY,
    days: [day(addDays(TODAY, -2), 0), day(addDays(TODAY, -1), 0), day(TODAY, 0)],
    paused: false,
    lastMood: null,
  });
  assert.equal(notYet.includesToday, false);
  assert.equal(notYet.mood, 'sleepy');
});

test('scheduled recovery and pre-onboarding days never count as failures', () => {
  const days = [
    day(addDays(TODAY, -3), 0, 1, { recovery: true }),
    day(addDays(TODAY, -2), 0, 1, { beforeOnboarding: true }),
    day(addDays(TODAY, -1), 0, 0),
    day(addDays(TODAY, -4), 1),
  ];
  const result = computeMood({ today: TODAY, days, paused: false, lastMood: null });
  assert.equal(result.usedDays, 1);
  assert.equal(result.mood, 'radiant');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isDateInPeriod,
  nextPeriodKey,
  periodKeyFor,
  periodKeysBetween,
  periodRangeFor,
  previousPeriodKey,
} from './periods';

test('period keys name one instance of a period', () => {
  assert.equal(periodKeyFor('daily', '2026-09-21', 1), '2026-09-21');
  assert.equal(periodKeyFor('weekly', '2026-09-23', 1), '2026-09-21');
  assert.equal(periodKeyFor('weekly', '2026-09-23', 7), '2026-09-20');
  assert.equal(periodKeyFor('monthly', '2026-09-23', 1), '2026-09');
  assert.equal(periodKeyFor('yearly', '2026-09-23', 1), '2026');
});

test('period ranges are inclusive local dates', () => {
  assert.deepEqual(periodRangeFor('daily', '2026-09-21', 1), {
    start: '2026-09-21',
    end: '2026-09-21',
  });
  assert.deepEqual(periodRangeFor('weekly', '2026-09-21', 1), {
    start: '2026-09-21',
    end: '2026-09-27',
  });
  assert.deepEqual(periodRangeFor('weekly', '2026-09-20', 7), {
    start: '2026-09-20',
    end: '2026-09-26',
  });
  assert.deepEqual(periodRangeFor('monthly', '2026-02', 1), {
    start: '2026-02-01',
    end: '2026-02-28',
  });
  assert.deepEqual(periodRangeFor('yearly', '2028', 1), {
    start: '2028-01-01',
    end: '2028-12-31',
  });
});

test('a new period is a new instance, never a reset', () => {
  assert.equal(nextPeriodKey('daily', '2026-09-30', 1), '2026-10-01');
  assert.equal(nextPeriodKey('weekly', '2026-12-28', 1), '2027-01-04');
  assert.equal(nextPeriodKey('monthly', '2026-12', 1), '2027-01');
  assert.equal(nextPeriodKey('yearly', '2026', 1), '2027');
  assert.equal(previousPeriodKey('daily', '2026-01-01', 1), '2025-12-31');
  assert.equal(previousPeriodKey('monthly', '2026-03', 1), '2026-02');
  assert.equal(previousPeriodKey('yearly', '2026', 1), '2025');
});

test('a date belongs to exactly one instance of each period', () => {
  assert.equal(isDateInPeriod('weekly', '2026-09-21', '2026-09-21', 1), true);
  assert.equal(isDateInPeriod('weekly', '2026-09-27', '2026-09-21', 1), true);
  assert.equal(isDateInPeriod('weekly', '2026-09-28', '2026-09-21', 1), false);
  assert.equal(isDateInPeriod('monthly', '2026-09-30', '2026-09', 1), true);
  assert.equal(isDateInPeriod('monthly', '2026-10-01', '2026-09', 1), false);
});

test('enumerating periods covers a whole year without gaps', () => {
  const daily = periodKeysBetween('daily', '2026-01-01', '2026-12-31', 1);
  assert.equal(daily.length, 365);
  assert.equal(daily[0], '2026-01-01');
  assert.equal(daily[daily.length - 1], '2026-12-31');

  const weekly = periodKeysBetween('weekly', '2026-01-01', '2026-12-31', 1);
  assert.ok(weekly.length >= 52 && weekly.length <= 53, `got ${weekly.length}`);

  const monthly = periodKeysBetween('monthly', '2026-01-01', '2026-12-31', 1);
  assert.equal(monthly.length, 12);
});

test('a leap year has one more day', () => {
  assert.equal(periodKeysBetween('daily', '2028-01-01', '2028-12-31', 1).length, 366);
});

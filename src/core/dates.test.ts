import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays,
  dayOfWeek,
  daysBetween,
  endOfLocalDayInstant,
  endOfMonth,
  formatDate,
  hasLocalDayEnded,
  isLeapYear,
  isValidTimeZone,
  localDateOf,
  localPartsOf,
  offsetMinutesAt,
  parseDate,
  startOfLocalDayInstant,
  startOfWeek,
  todayIn,
} from './dates';

const COPENHAGEN = 'Europe/Copenhagen';
const KATHMANDU = 'Asia/Kathmandu';

test('dates parse and format without drifting', () => {
  assert.deepEqual(parseDate('2026-09-21'), { year: 2026, month: 9, day: 21 });
  assert.equal(formatDate({ year: 2026, month: 9, day: 2 }), '2026-09-02');
  assert.throws(() => parseDate('2026-9-21'));
  assert.throws(() => parseDate('not a date'));
});

test('the local date follows the zone, not the machine', () => {
  assert.equal(localDateOf('2026-09-21T22:30:00Z', COPENHAGEN), '2026-09-22');
  assert.equal(localDateOf('2026-09-21T21:30:00Z', COPENHAGEN), '2026-09-21');
  assert.equal(localDateOf('2026-09-21T23:30:00Z', 'UTC'), '2026-09-21');
});

test('daylight saving is handled at both ends of the year', () => {
  // Summer time is +120 minutes, winter time +60.
  assert.equal(offsetMinutesAt('2026-07-01T12:00:00Z', COPENHAGEN), 120);
  assert.equal(offsetMinutesAt('2026-01-15T12:00:00Z', COPENHAGEN), 60);
});

test('a spring-forward day is 23 hours long and still starts at local midnight', () => {
  const start = startOfLocalDayInstant('2026-03-29', COPENHAGEN);
  const end = endOfLocalDayInstant('2026-03-29', COPENHAGEN);
  assert.equal(start, '2026-03-28T23:00:00.000Z');
  assert.equal(end, '2026-03-29T22:00:00.000Z');
  assert.equal((Date.parse(end) - Date.parse(start)) / 3_600_000, 23);
  assert.equal(localDateOf(start, COPENHAGEN), '2026-03-29');
});

test('an autumn day is 25 hours long', () => {
  const start = startOfLocalDayInstant('2026-10-25', COPENHAGEN);
  const end = endOfLocalDayInstant('2026-10-25', COPENHAGEN);
  assert.equal(start, '2026-10-24T22:00:00.000Z');
  assert.equal(end, '2026-10-25T23:00:00.000Z');
  assert.equal((Date.parse(end) - Date.parse(start)) / 3_600_000, 25);
});

test('zones with a 45-minute offset still land on midnight', () => {
  const start = startOfLocalDayInstant('2026-09-21', KATHMANDU);
  assert.equal(localDateOf(start, KATHMANDU), '2026-09-21');
  const parts = localPartsOf(start, KATHMANDU);
  assert.equal(parts.hour, 0);
  assert.equal(parts.minute, 0);
});

test('a day has ended once its last instant has passed', () => {
  assert.equal(hasLocalDayEnded('2026-09-20', COPENHAGEN, '2026-09-21T08:00:00Z'), true);
  assert.equal(hasLocalDayEnded('2026-09-21', COPENHAGEN, '2026-09-21T08:00:00Z'), false);
  assert.equal(hasLocalDayEnded('2026-09-21', COPENHAGEN, '2026-09-21T22:00:00Z'), true);
});

test('calendar arithmetic survives months, years and leap days', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2027-02-28', 1), '2027-03-01');
  assert.equal(isLeapYear(2028), true);
  assert.equal(isLeapYear(2100), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(endOfMonth('2028-02-10'), '2028-02-29');
  assert.equal(endOfMonth('2026-12-05'), '2026-12-31');
  assert.equal(daysBetween('2026-09-21', '2026-09-28'), 7);
});

test('weekdays are numbered Monday-first', () => {
  assert.equal(dayOfWeek('2026-01-01'), 4, '1 January 2026 is a Thursday');
  assert.equal(dayOfWeek('2026-09-21'), 1);
  assert.equal(dayOfWeek('2026-09-27'), 7);
});

test('the week can start on Monday or Sunday', () => {
  assert.equal(startOfWeek('2026-09-23', 1), '2026-09-21');
  assert.equal(startOfWeek('2026-09-27', 1), '2026-09-21');
  assert.equal(startOfWeek('2026-09-27', 7), '2026-09-27');
  assert.equal(startOfWeek('2026-09-23', 7), '2026-09-20');
});

test('time zones are validated rather than trusted', () => {
  assert.equal(isValidTimeZone('Europe/Copenhagen'), true);
  assert.equal(isValidTimeZone('Mars/Olympus'), false);
});

test('today is the local date of a given instant', () => {
  assert.equal(todayIn(COPENHAGEN, '2026-09-21T08:00:00Z'), '2026-09-21');
  assert.equal(todayIn('America/Los_Angeles', '2026-09-21T01:00:00Z'), '2026-09-20');
});

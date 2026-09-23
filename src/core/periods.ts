import { addDays, endOfMonth, endOfWeek, endOfYear, parseDate, startOfMonth, startOfWeek, startOfYear } from './dates';
import type { IsoDate, PeriodKind, WeekStart } from './types';

/**
 * Quest periods.
 *
 * A period key names one instance of a period and is stable for the user's own
 * settings, so a weekly quest keys off the local first day of its week rather
 * than an ISO week number. Calendar boundaries come from `dates.ts`, which
 * means daylight saving never shifts a boundary by a day.
 */

export function periodKeyFor(kind: PeriodKind, date: IsoDate, weekStart: WeekStart): string {
  switch (kind) {
    case 'daily':
      return date;
    case 'weekly':
      return startOfWeek(date, weekStart);
    case 'monthly': {
      const { year, month } = parseDate(date);
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    case 'yearly':
      return String(parseDate(date).year);
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unknown period: ${String(exhaustive)}`);
    }
  }
}

export type PeriodRange = { start: IsoDate; end: IsoDate };

export function periodRangeFor(
  kind: PeriodKind,
  key: string,
  weekStart: WeekStart,
): PeriodRange {
  switch (kind) {
    case 'daily':
      return { start: key, end: key };
    case 'weekly':
      return { start: key, end: endOfWeek(key, weekStart) };
    case 'monthly': {
      const start = `${key}-01`;
      return { start, end: endOfMonth(start) };
    }
    case 'yearly': {
      const start = `${key}-01-01`;
      return { start, end: endOfYear(start) };
    }
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unknown period: ${String(exhaustive)}`);
    }
  }
}

export function periodStartFor(
  kind: PeriodKind,
  key: string,
  weekStart: WeekStart,
): IsoDate {
  return periodRangeFor(kind, key, weekStart).start;
}

export function periodEndFor(kind: PeriodKind, key: string, weekStart: WeekStart): IsoDate {
  return periodRangeFor(kind, key, weekStart).end;
}

/** Keys are ordered, so "next" is always a new instance rather than a reset. */
export function nextPeriodKey(kind: PeriodKind, key: string, weekStart: WeekStart): string {
  const { start } = periodRangeFor(kind, key, weekStart);
  switch (kind) {
    case 'daily':
      return addDays(start, 1);
    case 'weekly':
      return addDays(start, 7);
    case 'monthly':
      return periodKeyFor('monthly', addDays(endOfMonth(start), 1), weekStart);
    case 'yearly':
      return String(parseDate(start).year + 1);
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unknown period: ${String(exhaustive)}`);
    }
  }
}

export function previousPeriodKey(
  kind: PeriodKind,
  key: string,
  weekStart: WeekStart,
): string {
  const { start } = periodRangeFor(kind, key, weekStart);
  switch (kind) {
    case 'daily':
      return addDays(start, -1);
    case 'weekly':
      return addDays(start, -7);
    case 'monthly':
      return periodKeyFor('monthly', addDays(startOfMonth(start), -1), weekStart);
    case 'yearly':
      return String(parseDate(start).year - 1);
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unknown period: ${String(exhaustive)}`);
    }
  }
}

export function isDateInPeriod(
  kind: PeriodKind,
  date: IsoDate,
  key: string,
  weekStart: WeekStart,
): boolean {
  const range = periodRangeFor(kind, key, weekStart);
  return date >= range.start && date <= range.end;
}

/** Every key from `from` to `to`, oldest first. Used by history views. */
export function periodKeysBetween(
  kind: PeriodKind,
  from: IsoDate,
  to: IsoDate,
  weekStart: WeekStart,
): string[] {
  const keys: string[] = [];
  let key = periodKeyFor(kind, from, weekStart);
  const last = periodKeyFor(kind, to, weekStart);
  let guard = 0;
  while (key <= last && guard < 5000) {
    keys.push(key);
    key = nextPeriodKey(kind, key, weekStart);
    guard += 1;
  }
  return keys;
}

export function periodLabelKey(kind: PeriodKind): string {
  switch (kind) {
    case 'daily':
      return 'period.daily';
    case 'weekly':
      return 'period.weekly';
    case 'monthly':
      return 'period.monthly';
    case 'yearly':
      return 'period.yearly';
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unknown period: ${String(exhaustive)}`);
    }
  }
}

export function startOfWeekFor(date: IsoDate, weekStart: WeekStart): IsoDate {
  return startOfWeek(date, weekStart);
}

export function startOfYearFor(date: IsoDate): IsoDate {
  return startOfYear(date);
}

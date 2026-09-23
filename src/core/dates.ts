import type { IsoDate, IsoInstant, TimeZone, WeekStart } from './types';

/**
 * Calendar arithmetic. Every function here is pure: dates are handled as
 * `YYYY-MM-DD` strings and instants as UTC ISO strings, so nothing depends on
 * the machine's own time zone and daylight saving is exercised by the tests.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DateParts = { year: number; month: number; day: number };

export function parseDate(date: IsoDate): DateParts {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new Error(`Not a local date: ${date}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Not a local date: ${date}`);
  }
  return { year, month, day };
}

export function formatDate(parts: DateParts): IsoDate {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${String(parts.year).padStart(4, '0')}-${month}-${day}`;
}

export function toUtcMillis(date: IsoDate): number {
  const { year, month, day } = parseDate(date);
  return Date.UTC(year, month - 1, day);
}

export function fromUtcMillis(millis: number): IsoDate {
  const date = new Date(millis);
  return formatDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMillis(toUtcMillis(date) + days * 86_400_000);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / 86_400_000);
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function isWithin(date: IsoDate, from: IsoDate, to: IsoDate): boolean {
  return compareDates(date, from) >= 0 && compareDates(date, to) <= 0;
}

/** 1 = Monday … 7 = Sunday, the calendar's own numbering. */
export function dayOfWeek(date: IsoDate): number {
  const day = new Date(toUtcMillis(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isWeekend(date: IsoDate): boolean {
  return dayOfWeek(date) >= 6;
}

/** First day of the week containing `date`, honouring the week-start setting. */
export function startOfWeek(date: IsoDate, weekStart: WeekStart): IsoDate {
  const weekday = dayOfWeek(date);
  const delta = weekStart === 1 ? weekday - 1 : (weekday % 7) ;
  return addDays(date, -delta);
}

export function endOfWeek(date: IsoDate, weekStart: WeekStart): IsoDate {
  return addDays(startOfWeek(date, weekStart), 6);
}

export function startOfMonth(date: IsoDate): IsoDate {
  const { year, month } = parseDate(date);
  return formatDate({ year, month, day: 1 });
}

export function endOfMonth(date: IsoDate): IsoDate {
  const { year, month } = parseDate(date);
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return addDays(formatDate({ ...nextMonth, day: 1 }), -1);
}

export function startOfYear(date: IsoDate): IsoDate {
  return formatDate({ year: parseDate(date).year, month: 1, day: 1 });
}

export function endOfYear(date: IsoDate): IsoDate {
  return formatDate({ year: parseDate(date).year, month: 12, day: 31 });
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isValidTimeZone(timeZone: TimeZone): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: TimeZone): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

export type LocalParts = DateParts & {
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

export function localPartsOf(instant: IsoInstant | number, timeZone: TimeZone): LocalParts {
  const millis = typeof instant === 'number' ? instant : Date.parse(instant);
  if (!Number.isFinite(millis)) throw new Error(`Not an instant: ${String(instant)}`);
  const parts = partsFormatter(timeZone).formatToParts(new Date(millis));
  const lookup = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((part) => part.type === type);
    return found ? Number(found.value) : 0;
  };
  const year = lookup('year');
  const month = lookup('month');
  const day = lookup('day');
  // Some ICU versions return hour 24 for local midnight.
  const hour = lookup('hour') % 24;
  return {
    year,
    month,
    day,
    hour,
    minute: lookup('minute'),
    second: lookup('second'),
    weekday: dayOfWeek(formatDate({ year, month, day })),
  };
}

/** The user's local calendar date for an instant, respecting the time zone. */
export function localDateOf(instant: IsoInstant | number, timeZone: TimeZone): IsoDate {
  const parts = localPartsOf(instant, timeZone);
  return formatDate(parts);
}

/** Minutes to add to UTC to reach local time at that instant. */
export function offsetMinutesAt(instant: IsoInstant | number, timeZone: TimeZone): number {
  const millis = typeof instant === 'number' ? instant : Date.parse(instant);
  const parts = localPartsOf(millis, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return Math.round((asUtc - millis) / 60_000);
}

/**
 * The instant at which a local day begins, found by correcting a UTC guess with
 * the zone's own offset. Two passes are enough to settle either side of a
 * daylight-saving change, and they keep the boundary stable when the clock
 * moves at midnight.
 */
export function startOfLocalDayInstant(date: IsoDate, timeZone: TimeZone): IsoInstant {
  const { year, month, day } = parseDate(date);
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  let instant = guess - offsetMinutesAt(guess, timeZone) * 60_000;
  instant = guess - offsetMinutesAt(instant, timeZone) * 60_000;
  return new Date(instant).toISOString();
}

export function endOfLocalDayInstant(date: IsoDate, timeZone: TimeZone): IsoInstant {
  return startOfLocalDayInstant(addDays(date, 1), timeZone);
}

/** True once the local day has finished, which is what mood counts as history. */
export function hasLocalDayEnded(date: IsoDate, timeZone: TimeZone, now: IsoInstant): boolean {
  return Date.parse(now) >= Date.parse(startOfLocalDayInstant(addDays(date, 1), timeZone));
}

export function todayIn(timeZone: TimeZone, now: IsoInstant | number = Date.now()): IsoDate {
  return localDateOf(now, timeZone);
}

export function nowInstant(now: number = Date.now()): IsoInstant {
  return new Date(now).toISOString();
}

export const DEFAULT_TIME_ZONE: TimeZone = 'UTC';

/**
 * Device time zone, when the platform can report one. Kept here as a value with
 * a fallback so the rules never depend on the platform.
 */
export function normalizeTimeZone(candidate: string | null | undefined): TimeZone {
  if (candidate && isValidTimeZone(candidate)) return candidate;
  return DEFAULT_TIME_ZONE;
}

export function formatLocalTimeOfDay(
  instant: IsoInstant,
  timeZone: TimeZone,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));
}

export function formatLocalDate(
  date: IsoDate,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  const { year, month, day } = parseDate(date);
  // Formatted in UTC so the label always matches the stored local date.
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

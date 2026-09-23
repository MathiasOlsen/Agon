import { daysBetween } from './dates';
import { moodTierFor } from './level';
import type { IsoDate, Mood } from './types';

/**
 * Temporary condition.
 *
 * Agon looks at the last seven eligible training days inside the last fourteen
 * calendar days. A "completed day" means the day has ended, not that a workout
 * succeeded. Scheduled recovery, paused days, unplanned days and days before
 * onboarding are ignored. Today can improve the score once its main action is
 * done, but it can never lower it before the day is over.
 *
 * This is a game response to logged quests, never an inference about health.
 */

export type MoodDay = {
  date: IsoDate;
  /** Main actions the plan asked for on that day. */
  plannedMain: number;
  /** Main actions actually completed. */
  completedMain: number;
  /** Scheduled recovery: part of the plan, but no exercise required. */
  recovery: boolean;
  /** Days before the user finished onboarding are not history. */
  beforeOnboarding: boolean;
};

export type MoodInput = {
  today: IsoDate;
  days: MoodDay[];
  /** True while the user has paused mood and streak evaluation. */
  paused: boolean;
  /** Mood to hold on to when there is no eligible history. */
  lastMood: Mood | null;
  /** Defaults to the fourteen-day window in the handoff. */
  recencyDays?: number;
  /** Defaults to seven eligible days. */
  sampleSize?: number;
};

export type MoodResult = {
  mood: Mood;
  /** Null when no eligible day existed; the mood is then carried over. */
  mean: number | null;
  usedDays: number;
  /** True when today's own completed main action was part of the score. */
  includesToday: boolean;
  /** True when the result is carried over from earlier history. */
  carriedOver: boolean;
};

export function scoreForDay(day: MoodDay): number {
  if (day.plannedMain <= 0) return 0;
  return Math.min(1, Math.max(0, day.completedMain / day.plannedMain));
}

export function isEligibleMoodDay(day: MoodDay, today: IsoDate): boolean {
  if (day.beforeOnboarding) return false;
  if (day.recovery) return false;
  if (day.plannedMain <= 0) return false;
  return day.date <= today;
}

export function computeMood(input: MoodInput): MoodResult {
  const recencyDays = input.recencyDays ?? 14;
  const sampleSize = input.sampleSize ?? 7;
  const todayDay = input.days.find((day) => day.date === input.today) ?? null;
  const todayIsRecovery = todayDay?.recovery ?? false;

  // Recovery and pause freeze the window instead of aging good days out.
  const agingLimit = input.paused || todayIsRecovery ? Number.POSITIVE_INFINITY : recencyDays;

  const eligible = input.days
    .filter((day) => isEligibleMoodDay(day, input.today))
    .filter((day) => day.date < input.today)
    .filter((day) => daysBetween(day.date, input.today) <= agingLimit)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, sampleSize);

  const scores = eligible.map(scoreForDay);

  let includesToday = false;
  if (
    todayDay &&
    !todayDay.beforeOnboarding &&
    !todayDay.recovery &&
    todayDay.plannedMain > 0 &&
    todayDay.completedMain > 0
  ) {
    // Today may lift the score but must not drag it down before the day ends.
    scores.unshift(Math.min(1, todayDay.completedMain / todayDay.plannedMain));
    includesToday = true;
  }

  if (scores.length === 0) {
    return {
      mood: input.lastMood ?? 'ready',
      mean: null,
      usedDays: 0,
      includesToday: false,
      carriedOver: true,
    };
  }

  const mean = scores.reduce((total, score) => total + score, 0) / scores.length;
  return {
    mood: moodTierFor(mean),
    mean,
    usedDays: scores.length,
    includesToday,
    carriedOver: false,
  };
}

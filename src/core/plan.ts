import { addDays, compareDates, dayOfWeek, startOfWeek } from './dates';
import type { ActivityKind, IsoDate, Modality, PlanSlot, WeekStart } from './types';

/**
 * The weekly plan.
 *
 * Quests are generated from this schedule, so the amount of movement Agon asks
 * for is always the amount the person chose. Recovery entries are part of the
 * plan and never require exercise.
 */

export type PlanDraft = {
  /** Weekdays (1–7) that carry a planned strength or aerobic session. */
  strengthDays: number[];
  cardioDays: number[];
  recoveryDays: number[];
  mobilityDays: number[];
};

export const WEEKDAYS: number[] = [1, 2, 3, 4, 5, 6, 7];

export function planSlotsFromDraft(draft: PlanDraft, idFor: (seed: string) => string): PlanSlot[] {
  const slots: PlanSlot[] = [];
  const push = (
    weekday: number,
    modality: Modality,
    kind: ActivityKind,
    titleKey: string,
    isRecovery: boolean,
  ) => {
    slots.push({
      id: idFor(`${weekday}-${titleKey}`),
      weekday,
      modality,
      kind,
      titleKey,
      templateId: null,
      isRecovery,
    });
  };
  for (const day of [...draft.strengthDays].sort()) {
    push(day, 'strength', 'strength', 'plan.strengthSession', false);
  }
  for (const day of [...draft.cardioDays].sort()) {
    push(day, 'walk', 'cardio', 'plan.aerobicSession', false);
  }
  for (const day of [...draft.mobilityDays].sort()) {
    push(day, 'mobility', 'mobility', 'plan.mobilitySession', false);
  }
  for (const day of [...draft.recoveryDays].sort()) {
    push(day, 'other', 'recovery', 'plan.recoveryDay', true);
  }
  return slots;
}

/** Reads a draft back out of stored slots, so a screen can edit the plan. */
export function planDraftFromSlots(slots: PlanSlot[]): PlanDraft {
  const weeks = (kind: 'strength' | 'cardio' | 'mobility') =>
    slots.filter((slot) => slot.kind === kind).map((slot) => slot.weekday);
  return {
    strengthDays: [...new Set(weeks('strength'))].sort(),
    cardioDays: [...new Set(weeks('cardio'))].sort(),
    recoveryDays: [...new Set(slots.filter((slot) => slot.isRecovery).map((slot) => slot.weekday))].sort(),
    mobilityDays: [...new Set(weeks('mobility'))].sort(),
  };
}

export function toggleWeekday(days: number[], weekday: number): number[] {
  return days.includes(weekday)
    ? days.filter((day) => day !== weekday)
    : [...days, weekday].sort();
}

export function slotsForWeekday(plan: PlanSlot[], weekday: number): PlanSlot[] {
  return plan.filter((slot) => slot.weekday === weekday);
}

/** Main actions are the planned strength and aerobic sessions. */
export function isMainSlot(slot: PlanSlot): boolean {
  return !slot.isRecovery && (slot.kind === 'strength' || slot.kind === 'cardio');
}

export function isSupportingSlot(slot: PlanSlot): boolean {
  return !slot.isRecovery && (slot.kind === 'mobility' || slot.kind === 'movement');
}

export function isRecoveryDay(plan: PlanSlot[], date: IsoDate): boolean {
  const slots = slotsForWeekday(plan, dayOfWeek(date));
  if (slots.length === 0) return false;
  return slots.every((slot) => slot.isRecovery);
}

export type PlannedDay = { date: IsoDate; slots: PlanSlot[] };

/** Every planned main session between two local dates, oldest first. */
export function plannedMainDaysBetween(
  plan: PlanSlot[],
  from: IsoDate,
  to: IsoDate,
): PlannedDay[] {
  const days: PlannedDay[] = [];
  let date = from;
  let guard = 0;
  while (compareDates(date, to) <= 0 && guard < 4000) {
    const slots = slotsForWeekday(plan, dayOfWeek(date)).filter(isMainSlot);
    if (slots.length > 0) days.push({ date, slots });
    date = addDays(date, 1);
    guard += 1;
  }
  return days;
}

export function plannedMainCountBetween(plan: PlanSlot[], from: IsoDate, to: IsoDate): number {
  return plannedMainDaysBetween(plan, from, to).length;
}

/**
 * Monthly and yearly targets are a share of what the plan actually asked for,
 * so a lighter month is not scored as a failure and planned breaks count.
 */
export const RHYTHM_SHARE = 0.85;
export const YEAR_SHARE = 0.8;

export function monthlyTargetFor(plan: PlanSlot[], from: IsoDate, to: IsoDate): number {
  const planned = plannedMainCountBetween(plan, from, to);
  return Math.max(1, Math.ceil(planned * RHYTHM_SHARE));
}

export function yearlyTargetFor(plan: PlanSlot[], from: IsoDate, to: IsoDate): number {
  const planned = plannedMainCountBetween(plan, from, to);
  return Math.max(1, Math.ceil(planned * YEAR_SHARE));
}

export function weeklyTargetFor(plan: PlanSlot[], from: IsoDate, to: IsoDate): number {
  return Math.max(1, plannedMainCountBetween(plan, from, to));
}

/** Weekly plan summary used on Today: "3 sessions this week". */
export function plannedSessionsInWeek(
  plan: PlanSlot[],
  date: IsoDate,
  weekStart: WeekStart,
): IsoDate[] {
  const start = startOfWeek(date, weekStart);
  const days: IsoDate[] = [];
  for (let index = 0; index < 7; index += 1) {
    const candidate = addDays(start, index);
    const slots = slotsForWeekday(plan, dayOfWeek(candidate)).filter(isMainSlot);
    if (slots.length > 0) days.push(candidate);
  }
  return days;
}

export function planIncludesDate(plan: PlanSlot[], date: IsoDate): boolean {
  return slotsForWeekday(plan, dayOfWeek(date)).length > 0;
}

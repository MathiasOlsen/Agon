import { useMemo } from 'react';

import { addDays, localDateOf, startOfLocalDayInstant } from '@/core/dates';
import {
  completedPlannedSessions,
  instanceIdFor,
  isPausedOn,
  kindMatches,
  moodFor,
  openSessionsForDate,
  progressOf,
  scheduledSessionsForDate,
} from '@/core/engine';
import type { MoodResult } from '@/core/mood';
import { isMainSlot, isRecoveryDay, plannedMainDaysBetween, plannedSessionsInWeek, slotsForWeekday } from '@/core/plan';
import { periodKeyFor, periodRangeFor } from '@/core/periods';
import type { AgonState, IsoDate, QuestInstance } from '@/core/types';

import { useApp } from './app-provider';

/**
 * Read-only views the screens share: what today looks like, which quests are
 * live, and how each one is doing.
 */

export function useToday(now: string = new Date().toISOString()): {
  today: IsoDate;
  sessions: ReturnType<typeof scheduledSessionsForDate>;
  openSessions: ReturnType<typeof openSessionsForDate>;
  isRecovery: boolean;
  plannedSlots: ReturnType<typeof slotsForWeekday>;
  mainSlots: ReturnType<typeof slotsForWeekday>;
} {
  const { state } = useApp();
  return useMemo(() => {
    const today = localDateOf(now, state.preferences.timeZone);
    const sessions = scheduledSessionsForDate(state, today);
    return {
      today,
      sessions,
      openSessions: openSessionsForDate(state, today),
      isRecovery: isRecoveryDay(state.planSlots, today),
      plannedSlots: slotsForWeekday(state.planSlots, weekdayOf(today)),
      mainSlots: slotsForWeekday(state.planSlots, weekdayOf(today)).filter(isMainSlot),
    };
  }, [state, now]);
}

function weekdayOf(date: IsoDate): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function useLevelProgress() {
  const { state } = useApp();
  return useMemo(() => progressOf(state), [state]);
}

/**
 * The temporary mood. It is recomputed from the snapshot rather than remembered,
 * so a correction that changes history changes the mood with it.
 */
export function useMood(now: string = new Date().toISOString()): MoodResult {
  const { state } = useApp();
  return useMemo(() => moodFor(state, now, null), [state, now]);
}

/** Quests that finished today but have not been celebrated yet. */
export function usePendingCelebration(now: string = new Date().toISOString()): {
  today: IsoDate;
  instances: QuestInstance[];
  bonusXp: number;
  totalXp: number;
} {
  const { state } = useApp();
  return useMemo(() => {
    const today = localDateOf(now, state.preferences.timeZone);
    const instances = state.questInstances.filter(
      (instance) =>
        instance.status === 'completed' &&
        !instance.celebrationAcknowledged &&
        instance.startDate <= today &&
        instance.endDate >= today,
    );
    const bonusXp = state.rewardEvents
      .filter(
        (reward) =>
          reward.kind === 'daily_bonus' &&
          reward.localDate === today &&
          reward.reversedAt === null,
      )
      .reduce((total, reward) => total + reward.deltaXp, 0);
    return {
      today,
      instances,
      bonusXp,
      totalXp: instances.reduce((total, instance) => total + instance.xp, 0) + bonusXp,
    };
  }, [state, now]);
}

/** Weekly and monthly counters for the "your quests updated" summary. */
export function usePeriodCounters(now: string = new Date().toISOString()): {
  weekly: { done: number; target: number };
  monthly: { done: number; target: number };
} {
  const { state } = useApp();
  return useMemo(() => {
    const today = localDateOf(now, state.preferences.timeZone);
    const read = (kind: 'weekly' | 'monthly') => {
      const key = periodKeyFor(kind, today, state.preferences.weekStart);
      const instance = state.questInstances.find(
        (candidate) => candidate.periodKind === kind && candidate.periodKey === key && candidate.kind === 'main',
      );
      const range = periodRangeFor(kind, key, state.preferences.weekStart);
      const done = completedPlannedSessions(state, range.start, range.end).length;
      return { done, target: instance?.target ?? 0 };
    };
    return { weekly: read('weekly'), monthly: read('monthly') };
  }, [state, now]);
}


export function useInstancesForPeriod(
  periodKind: 'daily' | 'weekly' | 'monthly' | 'yearly',
  now: string = new Date().toISOString(),
): { active: QuestInstance[]; completed: QuestInstance[]; archived: QuestInstance[] } {
  const { state } = useApp();
  return useMemo(() => {
    const today = localDateOf(now, state.preferences.timeZone);
    const key = periodKeyFor(periodKind, today, state.preferences.weekStart);
    const ofPeriod = state.questInstances.filter(
      (instance) => instance.periodKind === periodKind,
    );
    const inCurrent = ofPeriod.filter((instance) => instance.periodKey === key);
    const archived = ofPeriod
      .filter((instance) => instance.periodKey !== key && instance.status === 'archived_incomplete')
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    return {
      active: inCurrent.filter((instance) => instance.status !== 'completed'),
      completed: inCurrent.filter((instance) => instance.status === 'completed'),
      archived: archived.slice(0, 12),
    };
  }, [state, periodKind, now]);
}

export function useInstance(instanceId: string): QuestInstance | undefined {
  const { state } = useApp();
  return useMemo(
    () => state.questInstances.find((instance) => instance.id === instanceId),
    [state, instanceId],
  );
}

export function useWeeklySummary(now: string = new Date().toISOString()): {
  plannedDays: IsoDate[];
  completedDays: IsoDate[];
  weekStart: IsoDate;
} {
  const { state } = useApp();
  return useMemo(() => {
    const today = localDateOf(now, state.preferences.timeZone);
    const plannedDays = plannedSessionsInWeek(state.planSlots, today, state.preferences.weekStart);
    const range = periodRangeFor('weekly', periodKeyFor('weekly', today, state.preferences.weekStart), state.preferences.weekStart);
    const completedDays = completedPlannedSessions(state, range.start, range.end).map(
      (session) => session.localDate,
    );
    return { plannedDays, completedDays: [...new Set(completedDays)], weekStart: range.start };
  }, [state, now]);
}

/** How a day looked, used by the history strip on Today. */
export function dayStates(
  state: AgonState,
  from: IsoDate,
  to: IsoDate,
): Array<{ date: IsoDate; planned: boolean; completed: boolean; recovery: boolean }> {
  const days: Array<{ date: IsoDate; planned: boolean; completed: boolean; recovery: boolean }> = [];
  let date = from;
  let guard = 0;
  while (date <= to && guard < 400) {
    const planned = plannedMainDaysBetween(state.planSlots, date, date).length > 0;
    const completed = completedPlannedSessions(state, date, date).some((session) =>
      kindMatches(
        session.modality,
        slotsForWeekday(state.planSlots, weekdayOf(date))
          .filter(isMainSlot)
          .map((slot) => (slot.kind === 'strength' ? 'strength' : 'cardio')),
      ),
    );
    days.push({ date, planned, completed, recovery: isRecoveryDay(state.planSlots, date) });
    date = addDays(date, 1);
    guard += 1;
  }
  return days;
}

export function instanceForToday(state: AgonState, key: string, today: IsoDate): QuestInstance | undefined {
  return state.questInstances.find((instance) => instance.id === instanceIdFor(key, today));
}

export function startOfDay(date: IsoDate, timeZone: string): string {
  return startOfLocalDayInstant(date, timeZone);
}

export function isPaused(state: AgonState, date: IsoDate): boolean {
  return isPausedOn(state.preferences, date);
}

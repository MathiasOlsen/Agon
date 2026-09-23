import { compareDates } from './dates';
import {
  activeEvents,
  kindMatches,
  scheduledSessionsForDate,
} from './engine';
import { plannedMainDaysBetween } from './plan';
import type { AgonState, IsoDate, QuestInstance } from './types';

/**
 * What a quest has to show for itself.
 *
 * A quest never asks the person to type progress into it: progress comes from
 * finished sessions and logged activity. This turns that record into something
 * readable — what is done, what was missed, and what is still to come.
 */

export type ProgressItemStatus = 'done' | 'today' | 'upcoming' | 'missed';

export type ProgressItem = {
  key: string;
  date: IsoDate;
  /** Session or movement this item refers to, as a translation key. */
  titleKey: string;
  status: ProgressItemStatus;
  /** Amount, for entries logged by hand. */
  amount: number | null;
};

export type QuestBreakdown = {
  items: ProgressItem[];
  done: number;
  missed: number;
  upcoming: number;
  /** How much is left before the quest completes. */
  remaining: number;
};

function slotKind(slot: { kind: string }): 'strength' | 'cardio' {
  return slot.kind === 'strength' ? 'strength' : 'cardio';
}

function plannedItems(
  state: AgonState,
  instance: QuestInstance,
  today: IsoDate,
): ProgressItem[] {
  const wanted = instance.activityKinds;
  const days = plannedMainDaysBetween(state.planSlots, instance.startDate, instance.endDate);
  return days
    .filter((day) => compareDates(day.date, state.preferences.planStartDate) >= 0)
    .filter((day) => day.slots.some((slot) => wanted.includes(slotKind(slot))))
    .map((day) => {
      const sessions = scheduledSessionsForDate(state, day.date).filter((session) =>
        kindMatches(session.modality, wanted),
      );
      const finished = sessions.find(
        (session) => session.status === 'completed' || session.status === 'shortened',
      );
      // Prefer the session that exists; fall back to what the plan slot says that
      // day is, so a cardio day is never labelled as a strength session.
      const titleKey =
        (finished ?? sessions[0])?.titleKey ??
        day.slots.find((slot) => wanted.includes(slotKind(slot)))?.titleKey ??
        'plan.strengthSession';
      const status: ProgressItemStatus = finished
        ? 'done'
        : compareDates(day.date, today) === 0
          ? 'today'
          : compareDates(day.date, today) < 0
            ? 'missed'
            : 'upcoming';
      return {
        key: `${instance.id}:${day.date}`,
        date: day.date,
        titleKey,
        status,
        amount: null,
      };
    });
}

function loggedItems(state: AgonState, instance: QuestInstance): ProgressItem[] {
  return activeEvents(state)
    .filter((event) => {
      if (event.localDate < instance.startDate || event.localDate > instance.endDate) return false;
      if (event.measure !== instance.measure) return false;
      if (instance.activityKinds.length > 0 && !instance.activityKinds.includes(event.kind)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.localDate < b.localDate ? 1 : -1))
    .map((event) => ({
      key: event.id,
      date: event.localDate,
      titleKey: `activity.${event.kind}`,
      status: 'done' as const,
      amount: event.quantity,
    }));
}

export function questBreakdown(
  state: AgonState,
  instance: QuestInstance,
  today: IsoDate,
): QuestBreakdown {
  const items =
    instance.measure === 'planned_sessions'
      ? plannedItems(state, instance, today)
      : instance.measure === 'checkoff'
        ? []
        : loggedItems(state, instance);

  return {
    items,
    done: items.filter((item) => item.status === 'done').length,
    missed: items.filter((item) => item.status === 'missed').length,
    upcoming: items.filter((item) => item.status === 'today' || item.status === 'upcoming').length,
    remaining: Math.max(0, instance.target - instance.progress),
  };
}

/** The sentence that says how a quest is measured, one per unit. */
export function countsSentenceKey(instance: QuestInstance): string {
  switch (instance.measure) {
    case 'planned_sessions':
      return 'quests.counts.sessions';
    case 'minutes':
      return 'quests.counts.minutes';
    case 'seconds':
      return 'quests.counts.seconds';
    case 'reps':
      return 'quests.counts.reps';
    case 'steps':
      return 'quests.counts.steps';
    case 'distance_km':
      return 'quests.counts.distance';
    case 'checkoff':
    default:
      return 'quests.counts.checkoff';
  }
}

/**
 * The same explanation, short enough for a quest card. The card already carries
 * the objective, so this is the mechanics in a handful of words.
 */
export function countsShortKey(instance: QuestInstance): string {
  switch (instance.measure) {
    case 'planned_sessions':
      return 'quests.counts.short.sessions';
    case 'minutes':
      return 'quests.counts.short.minutes';
    case 'seconds':
      return 'quests.counts.short.seconds';
    case 'reps':
      return 'quests.counts.short.reps';
    case 'steps':
      return 'quests.counts.short.steps';
    case 'distance_km':
      return 'quests.counts.short.distance';
    case 'checkoff':
    default:
      return 'quests.counts.short.checkoff';
  }
}

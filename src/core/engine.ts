import { addDays, compareDates, dayOfWeek, localDateOf } from './dates';
import { bonusRewardKey, questRewardKey } from './ids';
import { levelProgress, type LevelProgress } from './level';
import { computeMood, type MoodResult } from './mood';
import { CATALOGUE, findCatalogueEntry, type CatalogueEntry } from './catalogue';
import {
  isMainSlot,
  isRecoveryDay,
  plannedMainDaysBetween,
  monthlyTargetFor,
  slotsForWeekday,
  weeklyTargetFor,
  yearlyTargetFor,
  type PlanDraft,
  planSlotsFromDraft,
} from './plan';
import { periodKeyFor, periodRangeFor } from './periods';
import { REWARD_TABLE } from './rewards';
import type {
  ActivityEvent,
  ActivityKind,
  AgonState,
  CardioLog,
  IsoDate,
  IsoInstant,
  Measurement,
  Modality,
  Mood,
  Mutation,
  Op,
  PlanSlot,
  Preferences,
  QuestInstance,
  QuestKind,
  QuestStatus,
  QuestTemplate,
  RewardEvent,
  ScheduledSession,
  TableName,
  WorkoutSession,
} from './types';

/**
 * The quest engine.
 *
 * Every function here is pure: it takes a snapshot and returns a new snapshot
 * plus the writes needed to persist it. Progress, status and rewards are always
 * derived from canonical records — planned sessions, activity events and the
 * reward ledger — so recomputing after a correction, an import or a restore
 * yields the same answer as the original path did.
 *
 * Two properties matter more than anything else in this file:
 *
 *  1. Rewards are keyed, so they cannot be granted twice by repeated taps, a
 *     restart, a re-import or a clock rollback.
 *  2. Corrections reverse the specific reward they invalidate instead of
 *     quietly keeping wrong XP.
 */

/** How many past days of daily quests are kept alive for a returning user. */
export const DAILY_BACKFILL_DAYS = 14;

/** How far ahead the plan is turned into dated sessions and quest instances. */
export const PLAN_HORIZON_DAYS = 14;

/**
 * A logged activity counts as the planned session when it is of the matching
 * kind and is not a token amount. Ten minutes is a tuning default: it keeps a
 * stray entry from completing a session, without demanding a full workout.
 */
export const MIN_MINUTES_FOR_SESSION = 10;

export function templateIdFor(catalogueKey: string): string {
  return `qt:${catalogueKey}`;
}

export function instanceIdFor(catalogueKey: string, periodKey: string): string {
  return `qi:${catalogueKey}:${periodKey}`;
}

export function modalityKind(modality: Modality): ActivityKind {
  switch (modality) {
    case 'strength':
      return 'strength';
    case 'mobility':
      return 'mobility';
    case 'walk':
    case 'run':
    case 'ride':
    case 'swim':
    case 'class':
    case 'sport':
    case 'other':
      return 'cardio';
    default:
      return 'cardio';
  }
}

/** Stable identity for a planned session: the plan can change, history cannot. */
export function scheduledSessionIdFor(date: IsoDate, kind: ActivityKind): string {
  return `ss:${date}:${kind}`;
}

export function scheduledSessionsForDate(
  state: AgonState,
  date: IsoDate,
): ScheduledSession[] {
  return state.scheduledSessions
    .filter((session) => session.localDate === date)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function openSessionsForDate(state: AgonState, date: IsoDate): ScheduledSession[] {
  return scheduledSessionsForDate(state, date).filter(
    (session) => session.status === 'planned' || session.status === 'rescheduled',
  );
}

export function kindMatches(modality: Modality, kinds: ActivityKind[]): boolean {
  if (kinds.length === 0) return true;
  return kinds.includes(modalityKind(modality));
}

export function totalXp(state: AgonState): number {
  return state.rewardEvents
    .filter((reward) => reward.reversedAt === null)
    .reduce((total, reward) => total + reward.deltaXp, 0);
}

export function progressOf(state: AgonState): LevelProgress {
  return levelProgress(totalXp(state));
}

export function isPausedOn(preferences: Preferences, date: IsoDate): boolean {
  const from = preferences.pausedFrom;
  const to = preferences.pausedTo;
  if (!from || !to) return false;
  return date >= from && date <= to;
}

function qualifiesAsSessionCompletion(event: ActivityEvent, session: ScheduledSession): boolean {
  if (event.deletedAt !== null) return false;
  if (event.localDate !== session.localDate) return false;
  if (modalityKind(session.modality) !== event.kind) return false;
  switch (event.measure) {
    case 'sessions':
      return true;
    case 'minutes':
      return event.quantity >= MIN_MINUTES_FOR_SESSION;
    default:
      return false;
  }
}

/**
 * Session status is derived, never assumed: a session is done when something
 * real happened, it is missed once its day has passed, and a correction that
 * removes the activity puts it back honestly.
 */
function statusAfterReconcile(
  session: ScheduledSession,
  events: ActivityEvent[],
  today: IsoDate,
): ScheduledSession['status'] {
  if (session.status === 'in_progress') return 'in_progress';
  const qualified = events.some((event) => qualifiesAsSessionCompletion(event, session));
  if (qualified) return session.status === 'shortened' ? 'shortened' : 'completed';
  if (session.localDate < today) return 'missed';
  // A rescheduled session keeps that meaning until something is recorded.
  return session.status === 'rescheduled' ? 'rescheduled' : 'planned';
}

// ---------------------------------------------------------------------------
// Progress derivation
// ---------------------------------------------------------------------------

export function activeEvents(state: AgonState): ActivityEvent[] {
  return state.activityEvents.filter((event) => event.deletedAt === null);
}

function eventsInRange(
  state: AgonState,
  instance: Pick<QuestInstance, 'startDate' | 'endDate' | 'measure' | 'activityKinds'>,
): ActivityEvent[] {
  return activeEvents(state).filter((event) => {
    if (event.localDate < instance.startDate) return false;
    if (event.localDate > instance.endDate) return false;
    if (event.measure !== instance.measure) return false;
    if (instance.activityKinds.length > 0 && !instance.activityKinds.includes(event.kind)) {
      return false;
    }
    return true;
  });
}

export function completedPlannedSessions(
  state: AgonState,
  from: IsoDate,
  to: IsoDate,
): ScheduledSession[] {
  return state.scheduledSessions.filter((session) => {
    if (session.localDate < from || session.localDate > to) return false;
    return session.status === 'completed' || session.status === 'shortened';
  });
}

/**
 * Raw progress for one instance, in the instance's own units. Each event is
 * counted once, and a quest never counts the same measurement twice.
 */
export function rawProgressFor(state: AgonState, instance: QuestInstance): number {
  switch (instance.measure) {
    case 'planned_sessions': {
      const sessions = completedPlannedSessions(state, instance.startDate, instance.endDate);
      return sessions.filter((session) => kindMatches(session.modality, instance.activityKinds))
        .length;
    }
    case 'checkoff':
      return eventsInRange(state, instance).reduce(
        (total, event) => total + Math.max(1, event.quantity),
        0,
      );
    case 'sessions':
      return eventsInRange(state, instance).reduce((total) => total + 1, 0);
    case 'minutes':
    case 'steps':
    case 'distance_km':
      return eventsInRange(state, instance).reduce((total, event) => total + event.quantity, 0);
    default:
      return 0;
  }
}

export function clampProgress(instance: QuestInstance, raw: number): number {
  return Math.max(0, Math.min(instance.target, raw));
}

export function statusFor(instance: QuestInstance, progress: number, today: IsoDate): QuestStatus {
  if (progress >= instance.target) return 'completed';
  if (compareDates(instance.endDate, today) < 0) return 'archived_incomplete';
  return progress > 0 ? 'in_progress' : 'not_started';
}

// ---------------------------------------------------------------------------
// Instance creation
// ---------------------------------------------------------------------------

function targetForEntry(
  state: AgonState,
  entry: CatalogueEntry,
  periodKey: string,
): number {
  if (entry.defaultTarget !== null) return entry.defaultTarget;
  const range = periodRangeFor(entry.periodKind, periodKey, state.preferences.weekStart);
  // Only count what the person was actually here for: a month or a year that
  // began before they started must not hand them an unreachable target.
  const from =
    compareDates(range.start, state.preferences.planStartDate) < 0
      ? state.preferences.planStartDate
      : range.start;
  switch (entry.periodKind) {
    case 'weekly':
      if (entry.key === 'strength_foundation') {
        const days = plannedMainDaysBetween(state.planSlots, from, range.end).filter((day) =>
          day.slots.some((slot) => slot.kind === 'strength'),
        );
        return Math.max(1, days.length);
      }
      return weeklyTargetFor(state.planSlots, from, range.end);
    case 'monthly':
      return monthlyTargetFor(state.planSlots, from, range.end);
    case 'yearly':
      return yearlyTargetFor(state.planSlots, from, range.end);
    default:
      return 1;
  }
}

function templateFor(state: AgonState, entry: CatalogueEntry, ops: Op[]): QuestTemplate {
  const id = templateIdFor(entry.key);
  const existing = state.questTemplates.find((template) => template.id === id);
  if (existing) return existing;
  const template: QuestTemplate = {
    id,
    catalogueKey: entry.key,
    periodKind: entry.periodKind,
    kind: entry.kind,
    measure: entry.measure,
    target: entry.defaultTarget ?? 1,
    xp: entry.kind === 'supporting' ? REWARD_TABLE.supportingDaily : REWARD_TABLE[entry.periodKind],
    activityKinds: entry.activityKinds,
    accessibleAlternative: entry.accessibleAlternative,
    revision: 1,
    active: true,
  };
  ops.push({ kind: 'put', table: 'quest_templates', record: recordFor('quest_templates', template) });
  // `state` is the working copy inside `recompute`, so this cannot reach the
  // caller's array.
  state.questTemplates.push(template);
  return template;
}

function createInstance(params: {
  state: AgonState;
  entry: CatalogueEntry;
  periodKey: string;
  now: IsoInstant;
  ops: Op[];
  existing: Map<string, QuestInstance>;
  target?: number;
}): QuestInstance {
  const { state, entry, periodKey, now, ops, existing } = params;
  const id = instanceIdFor(entry.key, periodKey);
  const found = existing.get(id);
  if (found) return found;
  const template = templateFor(state, entry, ops);
  const range = periodRangeFor(entry.periodKind, periodKey, state.preferences.weekStart);
  const instance: QuestInstance = {
    id,
    templateId: template.id,
    templateRevision: template.revision,
    catalogueKey: entry.key,
    periodKind: entry.periodKind,
    periodKey,
    startDate: range.start,
    endDate: range.end,
    kind: entry.kind,
    measure: template.measure,
    target: params.target ?? targetForEntry(state, entry, periodKey),
    xp: template.xp,
    activityKinds: template.activityKinds,
    accessibleAlternative: template.accessibleAlternative,
    status: 'not_started',
    progress: 0,
    completedAt: null,
    celebrationAcknowledged: false,
    createdAt: now,
  };
  ops.push({ kind: 'put', table: 'quest_instances', record: recordFor('quest_instances', instance) });
  existing.set(id, instance);
  return instance;
}

/**
 * Daily quests come from the day's plan: a strength day asks for the strength
 * session, an aerobic day for the aerobic one, and a recovery day simply asks
 * that the rest is respected.
 */
export function dailyEntriesFor(state: AgonState, date: IsoDate): CatalogueEntry[] {
  const slots = slotsForWeekday(state.planSlots, dayOfWeek(date));
  const entries: CatalogueEntry[] = [];
  const push = (key: string) => {
    const entry = findCatalogueEntry(key);
    if (entry && !entries.includes(entry)) entries.push(entry);
  };
  const mainSlots = slots.filter(isMainSlot);
  if (mainSlots.some((slot) => slot.kind === 'strength')) push('build_your_strength');
  if (mainSlots.some((slot) => slot.kind === 'cardio')) push('find_your_pace');
  if (slots.length > 0 && mainSlots.length === 0 && isRecoveryDay(state.planSlots, date)) {
    push('respect_the_rest');
  }
  return entries;
}

/**
 * Supporting habits that belong to a single day, created for each date.
 *
 * Weekly, monthly and yearly supporting goals are created by the period loop
 * with their own period key: feeding them a daily key here would key a monthly
 * quest by a date, which cannot be turned back into a period range.
 */
export function dailySupportingEntriesFor(state: AgonState): CatalogueEntry[] {
  return CATALOGUE.filter(
    (entry) =>
      entry.periodKind === 'daily' &&
      entry.kind === 'supporting' &&
      state.questTemplates.some(
        (template) => template.id === templateIdFor(entry.key) && template.active,
      ),
  );
}

export function enabledLongTermEntries(state: AgonState): CatalogueEntry[] {
  return CATALOGUE.filter(
    (entry) =>
      (entry.periodKind === 'weekly' ||
        entry.periodKind === 'monthly' ||
        entry.periodKind === 'yearly') &&
      state.questTemplates.some(
        (template) => template.id === templateIdFor(entry.key) && template.active,
      ),
  );
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

/**
 * Prepares a domain record for the storage layer, which keeps each record as
 * one JSON document. The shallow copy keeps ops immutable, and the table name
 * travels with the op so the store never has to infer it from the shape.
 */
export function recordFor(table: TableName, record: object): Record<string, unknown> {
  void table;
  return { ...record };
}

function sameRecord(a: Record<string, unknown> | undefined, b: Record<string, unknown>): boolean {
  if (!a) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (String(a[key] ?? '') !== String(b[key] ?? '')) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Recompute
// ---------------------------------------------------------------------------

export type RecomputeResult = Mutation & {
  completedNow: QuestInstance[];
  reversedNow: RewardEvent[];
};

/**
 * Brings the snapshot up to date for `today`: creates the quest instances the
 * plan implies, derives progress, archives what expired, and grants or reverses
 * rewards. Safe to run on every launch, on every write and after every import.
 */
export function recompute(state: AgonState, now: IsoInstant): RecomputeResult {
  const today = localDateOf(now, state.preferences.timeZone);
  const ops: Op[] = [];
  const templates = state.questTemplates.map((template) => ({ ...template }));
  const sessions = new Map(state.scheduledSessions.map((session) => [session.id, session]));

  // 1. Turn the weekly plan into dated sessions. A session keeps its identity
  //    when it is moved, shortened or completed.
  for (let offset = -DAILY_BACKFILL_DAYS; offset <= PLAN_HORIZON_DAYS; offset += 1) {
    const date = addDays(today, offset);
    if (compareDates(date, state.preferences.planStartDate) < 0) continue;
    for (const slot of slotsForWeekday(state.planSlots, dayOfWeek(date)).filter(isMainSlot)) {
      const id = scheduledSessionIdFor(date, slot.kind);
      if (sessions.has(id)) continue;
      const session: ScheduledSession = {
        id,
        templateId: slot.templateId,
        titleKey: slot.titleKey,
        modality: slot.modality,
        localDate: date,
        status: 'planned',
        revision: 1,
        workoutSessionId: null,
        rescheduledFrom: null,
        createdAt: now,
      };
      sessions.set(id, session);
      ops.push({ kind: 'put', table: 'scheduled_sessions', record: recordFor('scheduled_sessions', session) });
    }
  }

  // Derive each session's status from what was actually recorded. Overdue work
  // is shown as missed, without shame, and it never costs permanent XP.
  for (const [id, session] of sessions) {
    const status = statusAfterReconcile(session, state.activityEvents, today);
    if (status === session.status) continue;
    const reconciled: ScheduledSession = { ...session, status };
    sessions.set(id, reconciled);
    ops.push({
      kind: 'put',
      table: 'scheduled_sessions',
      record: recordFor('scheduled_sessions', reconciled),
    });
  }

  // 2. Make sure the templates the plan needs exist, and create the instances
  //    the plan implies.
  const workingState: AgonState = {
    ...state,
    questTemplates: templates,
    scheduledSessions: [...sessions.values()],
  };
  const instances = new Map(state.questInstances.map((instance) => [instance.id, instance]));
  for (let offset = DAILY_BACKFILL_DAYS - 1; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    if (compareDates(date, state.preferences.planStartDate) < 0) continue;
    for (const entry of dailyEntriesFor(workingState, date)) {
      createInstance({
        state: workingState,
        entry,
        periodKey: date,
        now,
        ops,
        existing: instances,
      });
    }
  }
  for (const entry of dailySupportingEntriesFor(workingState)) {
    for (let offset = DAILY_BACKFILL_DAYS - 1; offset >= 0; offset -= 1) {
      const date = addDays(today, -offset);
      if (compareDates(date, state.preferences.planStartDate) < 0) continue;
      createInstance({
        state: workingState,
        entry,
        periodKey: date,
        now,
        ops,
        existing: instances,
      });
    }
  }
  for (const entry of enabledLongTermEntries(workingState)) {
    const keys =
      entry.periodKind === 'weekly'
        ? [
            periodKeyFor('weekly', today, state.preferences.weekStart),
            periodKeyFor('weekly', addDays(today, -7), state.preferences.weekStart),
          ]
        : [periodKeyFor(entry.periodKind, today, state.preferences.weekStart)];
    for (const key of keys) {
      // A period that ended before the plan started is not this person's quest.
      const range = periodRangeFor(entry.periodKind, key, state.preferences.weekStart);
      if (compareDates(range.end, state.preferences.planStartDate) < 0) continue;
      createInstance({
        state: workingState,
        entry,
        periodKey: key,
        now,
        ops,
        existing: instances,
      });
    }
  }

  const ensuredTemplates = [...templates];
  const withTemplates: AgonState = {
    ...workingState,
    questTemplates: ensuredTemplates,
    scheduledSessions: [...sessions.values()],
  };
  const allInstances = [...instances.values()];

  // 3. Derive progress and status for every instance.
  const updated: QuestInstance[] = [];
  for (const instance of allInstances) {
    const raw = rawProgressFor(withTemplates, instance);
    const progress = clampProgress(instance, raw);
    const status = statusFor(instance, progress, today);
    const completedAt =
      status === 'completed'
        ? instance.completedAt ?? lastEventInstant(withTemplates, instance, now)
        : null;
    const next: QuestInstance = { ...instance, progress, status, completedAt };
    const previous = state.questInstances.find((candidate) => candidate.id === instance.id);
    if (!sameRecord(previous ? recordFor('quest_instances', previous) : undefined, recordFor('quest_instances', next))) {
      ops.push({ kind: 'put', table: 'quest_instances', record: recordFor('quest_instances', next) });
    }
    updated.push(next);
  }

  // 4. Grant, or reverse, quest rewards.
  const rewards = new Map(state.rewardEvents.map((reward) => [reward.id, reward]));
  const completedNow: QuestInstance[] = [];
  const reversedNow: RewardEvent[] = [];

  const supportingCompletedToday = updated
    .filter(
      (instance) =>
        instance.status === 'completed' &&
        instance.kind === 'supporting' &&
        instance.periodKind === 'daily' &&
        instance.startDate === today,
    )
    .sort((a, b) => (a.catalogueKey < b.catalogueKey ? -1 : 1))
    .map((instance) => instance.id);

  for (const instance of updated) {
    const key = questRewardKey(instance.id);
    const existing = rewards.get(key);
    const suppressed =
      instance.kind === 'supporting' &&
      instance.periodKind === 'daily' &&
      !supportingCompletedToday
        .slice(0, REWARD_TABLE.maxRewardedSupportingPerDay)
        .includes(instance.id);

    if (instance.status === 'completed' && !suppressed) {
      if (!existing) {
        const reward: RewardEvent = {
          id: key,
          kind: 'quest_completion',
          instanceId: instance.id,
          localDate: instance.startDate,
          deltaXp: instance.xp,
          grantedAt: instance.completedAt ?? now,
          reversedAt: null,
          reversalReason: null,
        };
        rewards.set(key, reward);
        ops.push({ kind: 'put', table: 'reward_events', record: recordFor('reward_events', reward) });
        completedNow.push(instance);
      } else if (existing.reversedAt !== null) {
        const restored: RewardEvent = { ...existing, reversedAt: null, reversalReason: null };
        rewards.set(key, restored);
        ops.push({ kind: 'put', table: 'reward_events', record: recordFor('reward_events', restored) });
        completedNow.push(instance);
      }
    } else if (existing && existing.reversedAt === null) {
      const reversed: RewardEvent = {
        ...existing,
        reversedAt: now,
        reversalReason: instance.status === 'completed' ? 'reward_cap' : 'correction',
      };
      rewards.set(key, reversed);
      ops.push({ kind: 'put', table: 'reward_events', record: recordFor('reward_events', reversed) });
      reversedNow.push(reversed);
    }
  }

  // 5. The daily bonus: once per training day on which the plan's main action
  //    was completed. Optional habits are never required, and an empty plan
  //    never earns it.
  const bonusDays = plannedMainDaysBetween(
    state.planSlots,
    addDays(today, -DAILY_BACKFILL_DAYS),
    today,
  );
  for (const day of bonusDays) {
    const key = bonusRewardKey(day.date);
    const existing = rewards.get(key);
    const completed = completedPlannedSessions(withTemplates, day.date, day.date).filter((session) =>
      kindMatches(
        session.modality,
        day.slots.map((slot) => (slot.kind === 'strength' ? 'strength' : 'cardio') as ActivityKind),
      ),
    );
    const earned = completed.length > 0;
    if (earned && !existing) {
      const reward: RewardEvent = {
        id: key,
        kind: 'daily_bonus',
        instanceId: null,
        localDate: day.date,
        deltaXp: REWARD_TABLE.dailyBonus,
        grantedAt: completed[0]?.createdAt ?? now,
        reversedAt: null,
        reversalReason: null,
      };
      rewards.set(key, reward);
      ops.push({ kind: 'put', table: 'reward_events', record: recordFor('reward_events', reward) });
    } else if (!earned && existing && existing.reversedAt === null) {
      const reversed: RewardEvent = {
        ...existing,
        reversedAt: now,
        reversalReason: 'correction',
      };
      rewards.set(key, reversed);
      ops.push({ kind: 'put', table: 'reward_events', record: recordFor('reward_events', reversed) });
      reversedNow.push(reversed);
    }
  }

  const nextState: AgonState = {
    ...withTemplates,
    questInstances: updated,
    rewardEvents: [...rewards.values()],
    scheduledSessions: [...sessions.values()],
  };

  const granted = completedNow
    .map((instance) => rewards.get(questRewardKey(instance.id)))
    .filter((reward): reward is RewardEvent => reward !== undefined);

  return { state: nextState, ops, granted, completedNow, reversedNow };
}

function lastEventInstant(state: AgonState, instance: QuestInstance, now: IsoInstant): IsoInstant {
  const events = eventsInRange(state, instance);
  if (events.length === 0) return now;
  return events.reduce(
    (latest, event) => (event.occurredAt > latest ? event.occurredAt : latest),
    events[0]?.occurredAt ?? now,
  );
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export function logActivity(
  state: AgonState,
  event: ActivityEvent,
  now: IsoInstant,
): RecomputeResult {
  const nextState: AgonState = { ...state, activityEvents: [...state.activityEvents, event] };
  const result = recompute(nextState, now);
  return {
    ...result,
    ops: [
      { kind: 'put', table: 'activity_events', record: recordFor('activity_events', event) },
      ...result.ops,
    ],
  };
}

export function correctActivity(
  state: AgonState,
  eventId: string,
  patch: Partial<Pick<ActivityEvent, 'quantity' | 'measure' | 'kind' | 'localDate' | 'note'>>,
  now: IsoInstant,
): RecomputeResult {
  const events = state.activityEvents.map((event) =>
    event.id === eventId
      ? { ...event, ...patch, revision: event.revision + 1 }
      : event,
  );
  const changed = events.find((event) => event.id === eventId);
  const result = recompute({ ...state, activityEvents: events }, now);
  return changed
    ? {
        ...result,
        ops: [
          { kind: 'put', table: 'activity_events', record: recordFor('activity_events', changed) },
          ...result.ops,
        ],
      }
    : result;
}

export function deleteActivity(
  state: AgonState,
  eventId: string,
  now: IsoInstant,
): RecomputeResult {
  const events = state.activityEvents.map((event) =>
    event.id === eventId
      ? { ...event, deletedAt: now, revision: event.revision + 1 }
      : event,
  );
  const changed = events.find((event) => event.id === eventId);
  const result = recompute({ ...state, activityEvents: events }, now);
  return changed
    ? {
        ...result,
        ops: [
          { kind: 'put', table: 'activity_events', record: recordFor('activity_events', changed) },
          ...result.ops,
        ],
      }
    : result;
}

export function checkoff(state: AgonState, instanceId: string, now: IsoInstant): RecomputeResult {
  const instance = state.questInstances.find((candidate) => candidate.id === instanceId);
  if (!instance) return recompute(state, now);
  const date = instance.startDate;
  const event: ActivityEvent = {
    id: `act:${instanceId}:${state.activityEvents.length}`,
    kind: instance.activityKinds[0] ?? 'movement',
    measure: 'checkoff',
    quantity: 1,
    occurredAt: now,
    localDate: date,
    timeZone: state.preferences.timeZone,
    source: 'manual',
    sourceId: instanceId,
    revision: 1,
    deletedAt: null,
    note: '',
  };
  return logActivity(state, event, now);
}

/** A visible acknowledgement only: the XP was granted when the quest closed. */
export function acknowledge(state: AgonState, instanceId: string): Mutation {
  const current = state.questInstances.find((instance) => instance.id === instanceId);
  if (!current || current.celebrationAcknowledged) {
    return { state, ops: [], granted: [] };
  }
  const instances = state.questInstances.map((instance) =>
    instance.id === instanceId ? { ...instance, celebrationAcknowledged: true } : instance,
  );
  const ops: Op[] = [
    {
      kind: 'put',
      table: 'quest_instances',
      record: recordFor('quest_instances', { ...current, celebrationAcknowledged: true }),
    },
  ];
  return { state: { ...state, questInstances: instances }, ops, granted: [] };
}

export function setPlan(
  state: AgonState,
  draft: PlanDraft,
  now: IsoInstant,
  idFor: (seed: string) => string,
): RecomputeResult {
  const today = localDateOf(now, state.preferences.timeZone);
  const slots = planSlotsFromDraft(draft, idFor);
  // A new plan applies from today onwards. Sessions that are still open are
  // dropped so the plan can change; anything already done stays as history.
  const obsolete = state.scheduledSessions.filter(
    (session) =>
      session.localDate >= today &&
      (session.status === 'planned' || session.status === 'rescheduled'),
  );
  const obsoleteIds = new Set(obsolete.map((session) => session.id));
  const ops: Op[] = [
    ...state.planSlots.map((slot) => ({ kind: 'delete' as const, table: 'plan_slots' as const, id: slot.id })),
    ...slots.map((slot) => ({
      kind: 'put' as const,
      table: 'plan_slots' as const,
      record: recordFor('plan_slots', slot),
    })),
    ...obsolete.map((session) => ({
      kind: 'delete' as const,
      table: 'scheduled_sessions' as const,
      id: session.id,
    })),
  ];
  const next: AgonState = {
    ...state,
    planSlots: slots,
    scheduledSessions: state.scheduledSessions.filter((session) => !obsoleteIds.has(session.id)),
  };
  const result = recompute(next, now);
  return { ...result, ops: [...ops, ...result.ops] };
}

export function setPreferences(
  state: AgonState,
  patch: Partial<Preferences>,
  now: IsoInstant,
): RecomputeResult {
  const preferences: Preferences = { ...state.preferences, ...patch };
  const ops: Op[] = [
    { kind: 'put', table: 'preferences', record: recordFor('preferences', preferences) },
  ];
  const result = recompute({ ...state, preferences }, now);
  return { ...result, ops: [...ops, ...result.ops] };
}

export function enableCatalogueEntry(
  state: AgonState,
  catalogueKey: string,
  enabled: boolean,
  target: number | null,
  now: IsoInstant,
): RecomputeResult {
  const entry = findCatalogueEntry(catalogueKey);
  if (!entry) return recompute(state, now);
  const id = templateIdFor(catalogueKey);
  const existing = state.questTemplates.find((template) => template.id === id);
  const template: QuestTemplate = existing
    ? {
        ...existing,
        active: enabled,
        target: target ?? existing.target,
        revision: existing.revision + (target !== null && target !== existing.target ? 1 : 0),
      }
    : {
        id,
        catalogueKey: entry.key,
        periodKind: entry.periodKind,
        kind: entry.kind,
        measure: entry.measure,
        target: target ?? entry.defaultTarget ?? 1,
        xp: entry.kind === 'supporting' ? REWARD_TABLE.supportingDaily : REWARD_TABLE[entry.periodKind],
        activityKinds: entry.activityKinds,
        accessibleAlternative: entry.accessibleAlternative,
        revision: 1,
        active: enabled,
      };
  const templates = existing
    ? state.questTemplates.map((candidate) => (candidate.id === id ? template : candidate))
    : [...state.questTemplates, template];
  const ops: Op[] = [
    { kind: 'put', table: 'quest_templates', record: recordFor('quest_templates', template) },
  ];
  const result = recompute({ ...state, questTemplates: templates }, now);
  return { ...result, ops: [...ops, ...result.ops] };
}

// ---------------------------------------------------------------------------
// Workout sessions
// ---------------------------------------------------------------------------

export function startWorkout(
  state: AgonState,
  params: {
    scheduledSessionId: string | null;
    modality: Modality;
    exercises: WorkoutSession['exercises'];
    startedAt: IsoInstant;
  },
): Mutation {
  const session: WorkoutSession = {
    id: `ws:${params.startedAt}:${state.workoutSessions.length}`,
    scheduledSessionId: params.scheduledSessionId,
    modality: params.modality,
    status: 'in_progress',
    startedAt: params.startedAt,
    endedAt: null,
    exercises: params.exercises,
  };
  const ops: Op[] = [
    { kind: 'put', table: 'workout_sessions', record: recordFor('workout_sessions', session) },
  ];
  if (params.scheduledSessionId) {
    const scheduled = state.scheduledSessions.find(
      (candidate) => candidate.id === params.scheduledSessionId,
    );
    if (scheduled) {
      const next: ScheduledSession = {
        ...scheduled,
        status: 'in_progress',
        workoutSessionId: session.id,
      };
      ops.push({ kind: 'put', table: 'scheduled_sessions', record: recordFor('scheduled_sessions', next) });
      return {
        state: {
          ...state,
          workoutSessions: [...state.workoutSessions, session],
          scheduledSessions: state.scheduledSessions.map((candidate) =>
            candidate.id === next.id ? next : candidate,
          ),
        },
        ops,
        granted: [],
      };
    }
  }
  return {
    state: { ...state, workoutSessions: [...state.workoutSessions, session] },
    ops,
    granted: [],
  };
}

export function logSet(
  state: AgonState,
  set: {
    sessionId: string;
    exerciseId: string;
    setIndex: number;
    reps: number;
    loadKg: number | null;
    completed: boolean;
    recordedAt: IsoInstant;
  },
): Mutation {
  const id = `sl:${set.sessionId}:${set.exerciseId}:${set.setIndex}`;
  const existing = state.setLogs.find((log) => log.id === id);
  const record = { id, ...set };
  const setLogs = existing
    ? state.setLogs.map((log) => (log.id === id ? record : log))
    : [...state.setLogs, record];
  return {
    state: { ...state, setLogs },
    ops: [{ kind: 'put', table: 'set_logs', record: recordFor('set_logs', record) }],
    granted: [],
  };
}

export function logCardio(state: AgonState, log: Omit<CardioLog, 'id'> & { id?: string }): Mutation {
  const id = log.id ?? `cl:${log.sessionId}`;
  const record = { ...log, id };
  const existing = state.cardioLogs.some((candidate) => candidate.id === id);
  return {
    state: {
      ...state,
      cardioLogs: existing
        ? state.cardioLogs.map((candidate) => (candidate.id === id ? record : candidate))
        : [...state.cardioLogs, record],
    },
    ops: [{ kind: 'put', table: 'cardio_logs', record: recordFor('cardio_logs', record) }],
    granted: [],
  };
}

/**
 * Finishing a session writes the canonical activity events once, then lets the
 * engine decide what that means for every quest it touches.
 */
export function completeWorkout(
  state: AgonState,
  sessionId: string,
  now: IsoInstant,
): RecomputeResult {
  const session = state.workoutSessions.find((candidate) => candidate.id === sessionId);
  if (!session) return recompute(state, now);
  const finished: WorkoutSession = { ...session, status: 'completed', endedAt: now };
  const localDate = localDateOf(session.startedAt, state.preferences.timeZone);
  const durationSec = Math.max(
    0,
    Math.round((Date.parse(now) - Date.parse(session.startedAt)) / 1000),
  );
  const kind = modalityKind(session.modality);
  const events: ActivityEvent[] = [
    {
      id: `act:${session.id}:session`,
      kind,
      measure: 'sessions',
      quantity: 1,
      occurredAt: session.startedAt,
      localDate,
      timeZone: state.preferences.timeZone,
      source: 'manual',
      sourceId: session.id,
      revision: 1,
      deletedAt: null,
      note: '',
    },
  ];
  if (durationSec >= 60) {
    events.push({
      id: `act:${session.id}:minutes`,
      kind,
      measure: 'minutes',
      quantity: Math.round(durationSec / 60),
      occurredAt: session.startedAt,
      localDate,
      timeZone: state.preferences.timeZone,
      source: 'manual',
      sourceId: session.id,
      revision: 1,
      deletedAt: null,
      note: '',
    });
  }
  const scheduledSessions = session.scheduledSessionId
    ? state.scheduledSessions.map((candidate) =>
        candidate.id === session.scheduledSessionId
          ? { ...candidate, status: 'completed' as const }
          : candidate,
      )
    : state.scheduledSessions;
  const ops: Op[] = [
    { kind: 'put', table: 'workout_sessions', record: recordFor('workout_sessions', finished) },
    ...events.map((event) => ({
      kind: 'put' as const,
      table: 'activity_events' as const,
      record: recordFor('activity_events', event),
    })),
    ...(session.scheduledSessionId
      ? scheduledSessions
          .filter((candidate) => candidate.id === session.scheduledSessionId)
          .map((candidate) => ({
            kind: 'put' as const,
            table: 'scheduled_sessions' as const,
            record: recordFor('scheduled_sessions', candidate),
          }))
      : []),
  ];
  const withoutOldEvents = state.activityEvents.filter(
    (event) => event.sourceId !== session.id || event.deletedAt !== null,
  );
  const next: AgonState = {
    ...state,
    workoutSessions: state.workoutSessions.map((candidate) =>
      candidate.id === sessionId ? finished : candidate,
    ),
    scheduledSessions,
    activityEvents: [...withoutOldEvents, ...events],
  };
  const result = recompute(next, now);
  return { ...result, ops: [...ops, ...result.ops] };
}

export function shortenSession(
  state: AgonState,
  scheduledSessionId: string,
  minutes: number,
  now: IsoInstant,
): RecomputeResult {
  const scheduled = state.scheduledSessions.find((entry) => entry.id === scheduledSessionId);
  if (!scheduled) return recompute(state, now);
  // Shortening replaces the original instance: it is the same session, done in
  // less time, so it can never become a second reward.
  const updated = state.scheduledSessions.map((entry) =>
    entry.id === scheduledSessionId ? { ...entry, status: 'shortened' as const } : entry,
  );
  const event: ActivityEvent = {
    id: `act:${scheduledSessionId}:shortened`,
    kind: modalityKind(scheduled.modality),
    measure: 'minutes',
    quantity: minutes,
    occurredAt: now,
    localDate: scheduled.localDate,
    timeZone: state.preferences.timeZone,
    source: 'manual',
    sourceId: scheduledSessionId,
    revision: 1,
    deletedAt: null,
    note: '',
  };
  const next: AgonState = {
    ...state,
    scheduledSessions: updated,
    activityEvents: [
      ...state.activityEvents.filter((candidate) => candidate.sourceId !== scheduledSessionId),
      event,
    ],
  };
  const result = recompute(next, now);
  return {
    ...result,
    ops: [
      { kind: 'put', table: 'activity_events', record: recordFor('activity_events', event) },
      { kind: 'put', table: 'scheduled_sessions', record: recordFor('scheduled_sessions', updated.find((entry) => entry.id === scheduledSessionId) ?? scheduled) },
      ...result.ops,
    ],
  };
}

export function rescheduleSession(
  state: AgonState,
  scheduledSessionId: string,
  newDate: IsoDate,
  now: IsoInstant,
): RecomputeResult {
  const scheduled = state.scheduledSessions.find((entry) => entry.id === scheduledSessionId);
  if (!scheduled) return recompute(state, now);
  const moved: ScheduledSession = {
    ...scheduled,
    localDate: newDate,
    status: 'rescheduled',
    revision: scheduled.revision + 1,
    rescheduledFrom: scheduled.rescheduledFrom ?? scheduled.localDate,
  };
  const next: AgonState = {
    ...state,
    scheduledSessions: state.scheduledSessions.map((entry) =>
      entry.id === scheduledSessionId ? moved : entry,
    ),
  };
  const result = recompute(next, now);
  return {
    ...result,
    ops: [
      { kind: 'put', table: 'scheduled_sessions', record: recordFor('scheduled_sessions', moved) },
      ...result.ops,
    ],
  };
}

// ---------------------------------------------------------------------------
// Mood
// ---------------------------------------------------------------------------

export function moodFor(state: AgonState, now: IsoInstant, lastMood: Mood | null): MoodResult {
  const today = localDateOf(now, state.preferences.timeZone);
  const days = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const plannedSlots = slotsForWeekday(state.planSlots, dayOfWeek(date)).filter(isMainSlot);
    const completed = completedPlannedSessions(state, date, date).filter((session) =>
      kindMatches(
        session.modality,
        plannedSlots.map((slot) => (slot.kind === 'strength' ? 'strength' : 'cardio') as ActivityKind),
      ),
    );
    days.push({
      date,
      plannedMain: plannedSlots.length > 0 ? 1 : 0,
      completedMain: completed.length > 0 ? 1 : 0,
      recovery: isRecoveryDay(state.planSlots, date),
      beforeOnboarding: date < state.preferences.planStartDate,
    });
  }
  return computeMood({
    today,
    days,
    paused: isPausedOn(state.preferences, today),
    lastMood,
  });
}

export function isRewardSuppressedForRecognition(
  state: AgonState,
  instance: QuestInstance,
): boolean {
  if (instance.kind !== 'supporting' || instance.periodKind !== 'daily') return false;
  const reward = state.rewardEvents.find((entry) => entry.id === questRewardKey(instance.id));
  return instance.status === 'completed' && (!reward || reward.reversedAt !== null);
}

export function questKindLabelKey(kind: QuestKind): string {
  return kind === 'main' ? 'quest.main' : 'quest.supporting';
}

export function isDefaultTemplateEnabled(state: AgonState, catalogueKey: string): boolean {
  return state.questTemplates.some(
    (template) => template.id === templateIdFor(catalogueKey) && template.active,
  );
}

export function planSlotCount(plan: PlanSlot[]): number {
  return plan.filter(isMainSlot).length;
}

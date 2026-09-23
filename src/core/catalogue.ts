import { rewardForQuest } from './rewards';
import type { ActivityKind, Measurement, PeriodKind, QuestKind, QuestTemplate } from './types';

/**
 * The quest catalogue, organised by size.
 *
 * Daily micro-quests need no equipment and no planning, so a bad day can still
 * be a completed day. The daily session is the bundle the plan scheduled.
 * Weekly quests are the workouts themselves. Monthly and yearly quests reward
 * consistency and review rather than heroics.
 */

export type CatalogueEntry = {
  key: string;
  periodKind: PeriodKind;
  kind: QuestKind;
  measure: Measurement;
  activityKinds: ActivityKind[];
  /** Null means "take the target from the user's plan". */
  defaultTarget: number | null;
  accessibleAlternative: Measurement | null;
  isRecovery: boolean;
  /** Where the movement came from, when this is a bundled session. */
  bundleKey: string | null;
};

function entry(
  key: string,
  periodKind: PeriodKind,
  kind: QuestKind,
  measure: Measurement,
  activityKinds: ActivityKind[],
  defaultTarget: number | null,
  options: Partial<Pick<CatalogueEntry, 'accessibleAlternative' | 'isRecovery' | 'bundleKey'>> = {},
): CatalogueEntry {
  return {
    key,
    periodKind,
    kind,
    measure,
    activityKinds,
    defaultTarget,
    accessibleAlternative: options.accessibleAlternative ?? null,
    isRecovery: options.isRecovery ?? false,
    bundleKey: options.bundleKey ?? null,
  };
}

export const CATALOGUE: CatalogueEntry[] = [
  // Daily micro-quests: small, doable right now, nothing required.
  entry('ten_push_ups', 'daily', 'supporting', 'reps', ['strength'], 10),
  entry('core_ten', 'daily', 'supporting', 'reps', ['strength'], 10),
  entry('twenty_squats', 'daily', 'supporting', 'reps', ['strength'], 20),
  entry('one_minute_plank', 'daily', 'supporting', 'seconds', ['strength'], 60),
  entry('ten_minute_walk', 'daily', 'supporting', 'minutes', ['movement'], 10),
  entry('reach_and_breathe', 'daily', 'supporting', 'minutes', ['mobility'], 2),

  // The session the plan scheduled for today.
  entry('build_your_strength', 'daily', 'main', 'planned_sessions', ['strength'], 1, {
    bundleKey: 'strength_a',
    accessibleAlternative: 'minutes',
  }),
  entry('find_your_pace', 'daily', 'main', 'planned_sessions', ['cardio'], 1, {
    bundleKey: 'cardio',
    accessibleAlternative: 'minutes',
  }),
  entry('make_it_happen', 'daily', 'main', 'minutes', ['strength', 'cardio'], 15),
  entry('respect_the_rest', 'daily', 'main', 'checkoff', ['recovery'], 1, { isRecovery: true }),

  // Weekly: the workouts.
  entry('strength_workout', 'weekly', 'main', 'planned_sessions', ['strength'], null, {
    bundleKey: 'strength_a',
  }),
  entry('cardio_workout', 'weekly', 'main', 'planned_sessions', ['cardio'], null, {
    bundleKey: 'cardio',
  }),
  entry('show_up', 'weekly', 'supporting', 'planned_sessions', ['strength', 'cardio'], null),
  entry('build_your_engine', 'weekly', 'supporting', 'minutes', ['cardio'], 90),
  entry('set_up_next_week', 'weekly', 'supporting', 'checkoff', [], 1),

  // Monthly: is the plan working?
  entry('find_your_rhythm', 'monthly', 'main', 'planned_sessions', ['strength', 'cardio'], null),
  entry('finish_the_chapter', 'monthly', 'supporting', 'checkoff', [], 1),
  entry('notice_your_progress', 'monthly', 'supporting', 'checkoff', [], 1),
  entry('make_it_fit', 'monthly', 'supporting', 'checkoff', [], 1),

  // Yearly: what is being built?
  entry('keep_showing_up', 'yearly', 'main', 'planned_sessions', ['strength', 'cardio'], null),
  entry('a_year_of_movement', 'yearly', 'supporting', 'distance_km', ['cardio', 'movement'], 300),
  entry('your_first_finish_line', 'yearly', 'supporting', 'checkoff', [], 1),
  entry('build_your_foundation', 'yearly', 'supporting', 'checkoff', [], 1),
];

export function findCatalogueEntry(key: string): CatalogueEntry | undefined {
  return CATALOGUE.find((candidate) => candidate.key === key);
}

export function templatesForPeriod(periodKind: PeriodKind): CatalogueEntry[] {
  return CATALOGUE.filter((candidate) => candidate.periodKind === periodKind);
}

/** The daily micro-quests, in the order they are offered. */
export function microQuestEntries(): CatalogueEntry[] {
  return CATALOGUE.filter(
    (candidate) => candidate.periodKind === 'daily' && candidate.kind === 'supporting',
  );
}

/** The two bundles a plan can lead with. */
export function bundleQuestEntries(): CatalogueEntry[] {
  return CATALOGUE.filter((candidate) => candidate.bundleKey !== null && candidate.periodKind === 'weekly');
}

/** Builds a stored template from a catalogue entry plus the user's target. */
export function createQuestTemplate(params: {
  id: string;
  entry: CatalogueEntry;
  target: number;
  revision?: number;
}): QuestTemplate {
  return {
    id: params.id,
    catalogueKey: params.entry.key,
    periodKind: params.entry.periodKind,
    kind: params.entry.kind,
    measure: params.entry.measure,
    target: params.target,
    xp: rewardForQuest(params.entry.periodKind, params.entry.kind),
    activityKinds: params.entry.activityKinds,
    accessibleAlternative: params.entry.accessibleAlternative,
    revision: params.revision ?? 1,
    active: true,
  };
}

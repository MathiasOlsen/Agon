import { rewardForQuest } from './rewards';
import type {
  ActivityKind,
  Measurement,
  PeriodKind,
  QuestKind,
  QuestTemplate,
} from './types';

/**
 * The quest catalogue.
 *
 * Playful names always come with a plain-language objective. Targets are
 * derived from the user's own plan wherever the plan can answer the question;
 * the constants here are the defaults used when it cannot.
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
};

export const CATALOGUE: CatalogueEntry[] = [
  {
    key: 'build_your_strength',
    periodKind: 'daily',
    kind: 'main',
    measure: 'planned_sessions',
    activityKinds: ['strength'],
    defaultTarget: 1,
    accessibleAlternative: 'minutes',
    isRecovery: false,
  },
  {
    key: 'find_your_pace',
    periodKind: 'daily',
    kind: 'main',
    measure: 'planned_sessions',
    activityKinds: ['cardio'],
    defaultTarget: 1,
    accessibleAlternative: 'minutes',
    isRecovery: false,
  },
  {
    key: 'make_it_happen',
    periodKind: 'daily',
    kind: 'main',
    measure: 'minutes',
    activityKinds: ['strength', 'cardio'],
    defaultTarget: 15,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'keep_moving',
    periodKind: 'daily',
    kind: 'supporting',
    measure: 'steps',
    activityKinds: ['movement'],
    defaultTarget: 6_000,
    accessibleAlternative: 'minutes',
    isRecovery: false,
  },
  {
    key: 'a_little_reset',
    periodKind: 'daily',
    kind: 'supporting',
    measure: 'minutes',
    activityKinds: ['mobility'],
    defaultTarget: 5,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'respect_the_rest',
    periodKind: 'daily',
    kind: 'main',
    measure: 'checkoff',
    activityKinds: ['recovery'],
    defaultTarget: 1,
    accessibleAlternative: null,
    isRecovery: true,
  },
  {
    key: 'show_up',
    periodKind: 'weekly',
    kind: 'main',
    measure: 'planned_sessions',
    activityKinds: ['strength', 'cardio'],
    defaultTarget: null,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'strength_foundation',
    periodKind: 'weekly',
    kind: 'supporting',
    measure: 'sessions',
    activityKinds: ['strength'],
    defaultTarget: null,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'build_your_engine',
    periodKind: 'weekly',
    kind: 'supporting',
    measure: 'minutes',
    activityKinds: ['cardio'],
    defaultTarget: 90,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'set_up_next_week',
    periodKind: 'weekly',
    kind: 'supporting',
    measure: 'checkoff',
    activityKinds: [],
    defaultTarget: 1,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'find_your_rhythm',
    periodKind: 'monthly',
    kind: 'main',
    measure: 'planned_sessions',
    activityKinds: ['strength', 'cardio'],
    defaultTarget: null,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'finish_the_chapter',
    periodKind: 'monthly',
    kind: 'supporting',
    measure: 'checkoff',
    activityKinds: [],
    defaultTarget: 1,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'notice_your_progress',
    periodKind: 'monthly',
    kind: 'supporting',
    measure: 'checkoff',
    activityKinds: [],
    defaultTarget: 1,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'make_it_fit',
    periodKind: 'monthly',
    kind: 'supporting',
    measure: 'checkoff',
    activityKinds: [],
    defaultTarget: 1,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'keep_showing_up',
    periodKind: 'yearly',
    kind: 'main',
    measure: 'planned_sessions',
    activityKinds: ['strength', 'cardio'],
    defaultTarget: null,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'your_first_finish_line',
    periodKind: 'yearly',
    kind: 'supporting',
    measure: 'checkoff',
    activityKinds: [],
    defaultTarget: 1,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'build_your_foundation',
    periodKind: 'yearly',
    kind: 'supporting',
    measure: 'sessions',
    activityKinds: ['strength'],
    defaultTarget: 100,
    accessibleAlternative: null,
    isRecovery: false,
  },
  {
    key: 'a_year_of_movement',
    periodKind: 'yearly',
    kind: 'supporting',
    measure: 'distance_km',
    activityKinds: ['cardio', 'movement'],
    defaultTarget: 100,
    accessibleAlternative: null,
    isRecovery: false,
  },
];

export function findCatalogueEntry(key: string): CatalogueEntry | undefined {
  return CATALOGUE.find((entry) => entry.key === key);
}

export function templatesForPeriod(periodKind: PeriodKind): CatalogueEntry[] {
  return CATALOGUE.filter((entry) => entry.periodKind === periodKind);
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

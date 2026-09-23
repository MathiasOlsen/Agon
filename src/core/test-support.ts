import { planSlotsFromDraft } from './plan';
import type {
  ActivityEvent,
  AgonState,
  Appearance,
  IsoDate,
  IsoInstant,
  Modality,
  Preferences,
} from './types';

/**
 * Fixtures shared by the test files. Keeping them here means a test can say
 * exactly what it cares about and inherit a sane everything-else.
 */

export const TEST_TIME_ZONE = 'Europe/Copenhagen';
/** Monday 21 September 2026, 10:00 local time. */
export const TEST_NOW: IsoInstant = '2026-09-21T08:00:00.000Z';
export const TEST_TODAY: IsoDate = '2026-09-21';

export const TEST_APPEARANCE: Appearance = {
  skin: 'honey',
  hair: 'coils',
  outfit: 'tee',
};

export function makePreferences(patch: Partial<Preferences> = {}): Preferences {
  return {
    onboarded: true,
    locale: 'en',
    theme: 'teal',
    nickname: '',
    appearance: TEST_APPEARANCE,
    weekStart: 1,
    loadUnit: 'kg',
    distanceUnit: 'km',
    timeZone: TEST_TIME_ZONE,
    reduceMotion: false,
    reminders: { enabled: false, hour: 18, minute: 0, plannedDaysOnly: true },
    pausedFrom: null,
    pausedTo: null,
    planStartDate: '2026-09-01',
    ...patch,
  };
}

/** Strength on Monday, aerobic on Wednesday, recovery on Thursday. */
export function makePlan(): AgonState['planSlots'] {
  let counter = 0;
  return planSlotsFromDraft(
    {
      strengthDays: [1],
      cardioDays: [3],
      recoveryDays: [4],
      mobilityDays: [],
    },
    (seed) => `slot:${seed}:${(counter += 1)}`,
  );
}

export function makeState(patch: Partial<AgonState> = {}): AgonState {
  return {
    preferences: makePreferences(),
    planSlots: makePlan(),
    questTemplates: [],
    questInstances: [],
    activityEvents: [],
    rewardEvents: [],
    scheduledSessions: [],
    workoutTemplates: [],
    workoutSessions: [],
    setLogs: [],
    cardioLogs: [],
    backup: { lastExportedAt: null, formatVersion: 1, lastRestoredAt: null },
    ...patch,
  };
}

export function makeActivityEvent(patch: Partial<ActivityEvent> & { localDate: IsoDate }): ActivityEvent {
  const { localDate, ...rest } = patch;
  return {
    id: `act:test:${localDate}:${patch.kind ?? 'strength'}:${patch.measure ?? 'sessions'}`,
    kind: 'strength',
    measure: 'sessions',
    quantity: 1,
    occurredAt: `${localDate}T08:00:00.000Z`,
    timeZone: TEST_TIME_ZONE,
    source: 'manual',
    sourceId: null,
    revision: 1,
    deletedAt: null,
    note: '',
    ...rest,
    localDate,
  };
}

export function makeModalityEvent(params: {
  localDate: IsoDate;
  modality: Modality;
  minutes?: number;
  quantity?: number;
}): ActivityEvent {
  const kind =
    params.modality === 'strength'
      ? 'strength'
      : params.modality === 'mobility'
        ? 'mobility'
        : 'cardio';
  const usesMinutes = params.minutes !== undefined;
  return makeActivityEvent({
    localDate: params.localDate,
    kind,
    measure: usesMinutes ? 'minutes' : 'sessions',
    quantity: usesMinutes ? (params.minutes ?? 0) : (params.quantity ?? 1),
    id: `act:test:${params.localDate}:${params.modality}:${usesMinutes ? 'minutes' : 'sessions'}`,
  });
}

/** Deterministic byte source so backup tests are reproducible. */
export function deterministicRandom(seed = 7): (length: number) => Uint8Array {
  let state = seed;
  return (length: number) => {
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
      bytes[index] = Math.floor((state / 2_147_483_648) * 256);
    }
    return bytes;
  };
}

export function rewardTotal(state: AgonState): number {
  return state.rewardEvents
    .filter((reward) => reward.reversedAt === null)
    .reduce((total, reward) => total + reward.deltaXp, 0);
}

export function instanceById(state: AgonState, id: string) {
  return state.questInstances.find((instance) => instance.id === id);
}

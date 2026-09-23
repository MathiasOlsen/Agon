import * as Crypto from 'expo-crypto';
import { getCalendars, getLocales } from 'expo-localization';

import { localDateOf, normalizeTimeZone } from '@/core/dates';
import { createId } from '@/core/ids';
import { isMainSlot } from '@/core/plan';
import { resolveLocale, type Locale } from '@/i18n';
import type { AgonState, Appearance, IsoInstant, PlanSlot, Preferences, TimeZone } from '@/core/types';

/** Device facts, read once and then stored as ordinary preferences. */

export function deviceTimeZone(): TimeZone {
  const calendar = getCalendars()[0];
  return normalizeTimeZone(calendar?.timeZone ?? null);
}

export function deviceLocale(): Locale {
  return resolveLocale(getLocales().map((locale) => locale.languageTag));
}

export function randomBytes(length: number): Uint8Array {
  return Crypto.getRandomBytes(length);
}

export function newId(prefix: string, now: number = Date.now()): string {
  return createId(prefix, randomBytes, now);
}

export const DEFAULT_APPEARANCE: Appearance = {
  skin: 'honey',
  hair: 'coils',
  outfit: 'tee',
};

export function defaultPreferences(now: IsoInstant = new Date().toISOString()): Preferences {
  const timeZone = deviceTimeZone();
  return {
    onboarded: false,
    locale: deviceLocale(),
    theme: 'teal',
    nickname: '',
    appearance: DEFAULT_APPEARANCE,
    weekStart: 1,
    loadUnit: 'kg',
    distanceUnit: 'km',
    timeZone,
    reduceMotion: false,
    reminders: { enabled: false, hour: 18, minute: 0, plannedDaysOnly: true },
    pausedFrom: null,
    pausedTo: null,
    planStartDate: localDateOf(now, timeZone),
  };
}

export function emptyState(preferences: Preferences): AgonState {
  return {
    preferences,
    planSlots: [],
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
  };
}

/**
 * The quests a new person starts with: one main goal per period and a couple of
 * optional habits, never the whole catalogue as an obligation.
 */
export function defaultCatalogueKeys(plan: PlanSlot[]): string[] {
  const keys = new Set<string>([
    'find_your_rhythm',
    'keep_showing_up',
    'set_up_next_week',
  ]);
  const mainSlots = plan.filter(isMainSlot);
  const hasStrength = mainSlots.some((slot) => slot.kind === 'strength');
  const hasCardio = mainSlots.some((slot) => slot.kind === 'cardio');
  // The week is led by the bundle that matches the plan's emphasis.
  if (hasStrength) keys.add('strength_workout');
  if (hasCardio) keys.add('cardio_workout');
  if (hasCardio) keys.add('build_your_engine');
  keys.add('show_up');
  // Two micro-quests by default: one strength-ish, one moving-ish.
  keys.add('ten_push_ups');
  keys.add('ten_minute_walk');
  return [...keys];
}

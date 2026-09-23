import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlanSlot, Preferences } from '@/core/types';
import { isMainSlot } from '@/core/plan';

/**
 * Reminders.
 *
 * Everything is scheduled on the device, with generic lock-screen wording: no
 * goal, no body, no numbers. The permission is only ever requested when someone
 * turns reminders on, and denial leaves manual use completely unaffected.
 */

const CHANNEL_ID = 'agon-reminders';

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Expo counts Sunday as 1; Agon counts Monday as 1. */
function expoWeekday(weekday: number): number {
  return weekday === 7 ? 1 : weekday + 1;
}

export function plannedWeekdays(plan: PlanSlot[]): number[] {
  const weekdays = new Set<number>();
  for (const slot of plan) {
    if (isMainSlot(slot)) weekdays.add(slot.weekday);
  }
  return [...weekdays].sort();
}

export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Replaces the schedule with one repeating reminder per planned weekday. Every
 * change cancels first, so switching language or time can never double up.
 */
export async function scheduleReminders(params: {
  preferences: Preferences;
  plan: PlanSlot[];
  title: string;
  body: string;
}): Promise<{ scheduled: number }> {
  await cancelReminders();
  const { preferences, plan } = params;
  // Reminders are an on-device feature; a browser tab has no schedule to keep.
  if (Platform.OS === 'web') return { scheduled: 0 };
  if (!preferences.reminders.enabled) return { scheduled: 0 };

  const permission = await requestPermission();
  if (!permission) return { scheduled: 0 };

  await ensureChannel();
  const weekdays = preferences.reminders.plannedDaysOnly
    ? plannedWeekdays(plan)
    : [1, 2, 3, 4, 5, 6, 7];

  for (const weekday of weekdays) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: expoWeekday(weekday),
        hour: preferences.reminders.hour,
        minute: preferences.reminders.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
  return { scheduled: weekdays.length };
}

export async function scheduledCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
}

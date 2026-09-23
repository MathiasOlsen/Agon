import type { PeriodKind, QuestKind } from './types';

/**
 * Reward quantities are tuning defaults, not promises. What matters is that a
 * quest awards its reward once, and that exercise is never made worth more by
 * doing extra repetitions, heavier loads or duplicate quests.
 */

export const REWARD_TABLE = {
  daily: 200,
  weekly: 600,
  monthly: 2_000,
  yearly: 10_000,
  /** Optional supporting habits. */
  supportingDaily: 50,
  /** At most this many supporting quests are rewarded on a single day. */
  maxRewardedSupportingPerDay: 2,
  /** Once per training day, when the planned main action is completed. */
  dailyBonus: 50,
} as const;

export function rewardForQuest(periodKind: PeriodKind, kind: QuestKind): number {
  if (kind === 'supporting') return REWARD_TABLE.supportingDaily;
  return REWARD_TABLE[periodKind];
}

/** Labels used by the quest catalogue, so tests can assert the shared shape. */
export const XP_ACKNOWLEDGEMENT = 'claim';

import type { Mood } from './types';

/**
 * Permanent progression.
 *
 * Reaching level `n` requires cumulative XP `100 × (n − 1) × (n + 2)`, so level
 * 1 begins at 0 and level 30 at 92,800. The interval from level `n` to `n + 1`
 * is always `200 × (n + 1)`, which is worth knowing when reading the curve back
 * to a person: it is 400 XP at level 1 and 6,200 XP at level 29.
 */
export const MAX_LEVEL = 30;

export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  const capped = Math.min(level, MAX_LEVEL);
  return 100 * (capped - 1) * (capped + 2);
}

export function xpIntervalForLevel(level: number): number {
  return 200 * (Math.min(Math.max(level, 1), MAX_LEVEL) + 1);
}

export function levelForXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < MAX_LEVEL && xp >= cumulativeXpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

export type LevelProgress = {
  totalXp: number;
  level: number;
  /** XP earned inside the current level interval. */
  xpIntoLevel: number;
  /** Size of the current interval. */
  xpForNextLevel: number;
  /** Null once level 30 is reached: Agon keeps recording lifetime XP. */
  nextLevelAt: number | null;
  isMaxLevel: boolean;
  fraction: number;
};

export function levelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelForXp(xp);
  const intervalStart = cumulativeXpForLevel(level);
  const isMaxLevel = level >= MAX_LEVEL;
  const intervalSize = xpIntervalForLevel(level);
  const xpIntoLevel = xp - intervalStart;
  if (isMaxLevel) {
    return {
      totalXp: xp,
      level,
      xpIntoLevel,
      xpForNextLevel: 0,
      nextLevelAt: null,
      isMaxLevel,
      fraction: 1,
    };
  }
  return {
    totalXp: xp,
    level,
    xpIntoLevel,
    xpForNextLevel: intervalSize,
    nextLevelAt: cumulativeXpForLevel(level + 1),
    isMaxLevel,
    fraction: intervalSize === 0 ? 0 : xpIntoLevel / intervalSize,
  };
}

/** Six appearance tiers: 5 levels each, per the handoff. */
export type AppearanceTier =
  | 'beginner'
  | 'rhythm'
  | 'athletic'
  | 'heroic'
  | 'radiant'
  | 'ascendant';

const TIERS: AppearanceTier[] = [
  'beginner',
  'rhythm',
  'athletic',
  'heroic',
  'radiant',
  'ascendant',
];

export function tierForLevel(level: number): AppearanceTier {
  const index = Math.min(Math.floor((Math.max(1, level) - 1) / 5), TIERS.length - 1);
  return TIERS[index] ?? 'beginner';
}

export function levelRangeForTier(tier: AppearanceTier): { from: number; to: number } {
  const index = TIERS.indexOf(tier);
  const safeIndex = index < 0 ? 0 : index;
  return { from: safeIndex * 5 + 1, to: safeIndex * 5 + 5 };
}

/** The next tier the user is working towards, or null at the top. */
export function nextTierForLevel(level: number): AppearanceTier | null {
  const currentIndex = TIERS.indexOf(tierForLevel(level));
  return TIERS[currentIndex + 1] ?? null;
}

/**
 * Temporary condition. Mean completion over the eligible window maps onto five
 * moods; see `mood.ts` for how the mean is computed.
 */
export function moodTierFor(mean: number): Mood {
  if (mean >= 0.8) return 'radiant';
  if (mean >= 0.6) return 'energetic';
  if (mean >= 0.4) return 'ready';
  if (mean >= 0.2) return 'warming';
  return 'sleepy';
}

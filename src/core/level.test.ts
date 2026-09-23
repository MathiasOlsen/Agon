import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_LEVEL,
  cumulativeXpForLevel,
  levelForXp,
  levelProgress,
  nextTierForLevel,
  tierForLevel,
  xpIntervalForLevel,
} from './level';

test('the published curve matches the handoff', () => {
  assert.equal(cumulativeXpForLevel(1), 0);
  assert.equal(cumulativeXpForLevel(2), 400);
  assert.equal(cumulativeXpForLevel(8), 7_000);
  assert.equal(cumulativeXpForLevel(9), 8_800);
  assert.equal(cumulativeXpForLevel(30), 92_800);
  assert.equal(cumulativeXpForLevel(99), 92_800, 'the curve clamps at level 30');
});

test('the curve never goes backwards', () => {
  for (let level = 2; level <= MAX_LEVEL; level += 1) {
    assert.ok(
      cumulativeXpForLevel(level) > cumulativeXpForLevel(level - 1),
      `level ${level} must cost more than level ${level - 1}`,
    );
  }
});

test('levels map from XP at their exact boundaries', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(399), 1);
  assert.equal(levelForXp(400), 2);
  assert.equal(levelForXp(6_999), 7);
  assert.equal(levelForXp(7_000), 8);
  assert.equal(levelForXp(92_799), 29);
  assert.equal(levelForXp(92_800), 30);
  assert.equal(levelForXp(500_000), 30, 'past the top there is no empty meter');
});

test('the level-8 interval reads 7,000 of 1,800', () => {
  const progress = levelProgress(7_000);
  assert.equal(progress.level, 8);
  assert.equal(progress.xpIntoLevel, 0);
  assert.equal(progress.xpForNextLevel, 1_800);
  assert.equal(progress.nextLevelAt, 8_800);
  assert.equal(progress.isMaxLevel, false);

  const midway = levelProgress(7_900);
  assert.equal(midway.xpIntoLevel, 900);
  assert.equal(Math.round(midway.fraction * 100), 50);
});

test('the interval grows by 200 XP per level', () => {
  assert.equal(xpIntervalForLevel(1), 400);
  assert.equal(xpIntervalForLevel(8), 1_800);
  assert.equal(xpIntervalForLevel(29), 6_000);
});

test('level 30 keeps counting XP', () => {
  const progress = levelProgress(120_000);
  assert.equal(progress.level, 30);
  assert.equal(progress.isMaxLevel, true);
  assert.equal(progress.nextLevelAt, null);
  assert.equal(progress.fraction, 1);
});

test('tiers cover five levels each', () => {
  assert.equal(tierForLevel(1), 'beginner');
  assert.equal(tierForLevel(5), 'beginner');
  assert.equal(tierForLevel(6), 'rhythm');
  assert.equal(tierForLevel(10), 'rhythm');
  assert.equal(tierForLevel(11), 'athletic');
  assert.equal(tierForLevel(20), 'heroic');
  assert.equal(tierForLevel(25), 'radiant');
  assert.equal(tierForLevel(26), 'ascendant');
  assert.equal(tierForLevel(30), 'ascendant');
  assert.equal(nextTierForLevel(30), null);
  assert.equal(nextTierForLevel(1), 'rhythm');
});

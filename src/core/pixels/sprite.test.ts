import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCharacter, buildChip, buildMark, poseForMood } from './character';
import { createGrid, fillRect, gridFromStrings, pixelCount, setPixel, toRects, type Grid } from './grid';
import { ICON_SIZE, buildIcon, iconNames } from './icons';
import type { Appearance, Mood } from '../types';

const APPEARANCE: Appearance = { skin: 'honey', hair: 'coils', outfit: 'tee' };
const MOODS: Mood[] = ['sleepy', 'warming', 'ready', 'energetic', 'radiant'];

function gridFromRects(width: number, height: number, rects: ReturnType<typeof toRects>): Grid {
  const grid = createGrid(width, height);
  for (const rect of rects) {
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) setPixel(grid, x, y, rect.key);
    }
  }
  return grid;
}

test('rectangle decomposition reproduces the sprite exactly', () => {
  const grid = buildCharacter({ level: 23, mood: 'radiant', appearance: APPEARANCE });
  const rects = toRects(grid);
  const rebuilt = gridFromRects(grid[0]?.length ?? 0, grid.length, rects);
  assert.deepEqual(rebuilt, grid);
});

test('rectangles are far fewer than pixels, which is the point', () => {
  const grid = buildCharacter({ level: 8, mood: 'ready', appearance: APPEARANCE });
  const rects = toRects(grid);
  assert.ok(pixelCount(grid) > 250, 'the sprite has real content');
  assert.ok(
    rects.length < pixelCount(grid) / 3,
    `expected a compact decomposition, got ${rects.length} rects for ${pixelCount(grid)} pixels`,
  );
});

test('overlapping and adjacent runs merge correctly', () => {
  const grid = createGrid(8, 4);
  fillRect(grid, 1, 1, 3, 2, 'outfit');
  setPixel(grid, 7, 3, 'ink');
  const rects = toRects(grid);
  assert.equal(rects.length, 2);
  const rebuilt = gridFromRects(8, 4, rects);
  assert.deepEqual(rebuilt, grid);
});

test('hand-authored art is padded rather than trusted', () => {
  const grid = gridFromStrings(['##', '#'], { '#': 'ink' }, 4);
  assert.equal(grid[0]?.length, 4);
  assert.deepEqual(grid[0], ['ink', 'ink', null, null]);
  assert.deepEqual(grid[1], ['ink', null, null, null]);
});

test('the character is always the same frame', () => {
  for (const mood of MOODS) {
    const grid = buildCharacter({ level: 12, mood, appearance: APPEARANCE });
    assert.equal(grid.length, 32);
    assert.equal(grid[0]?.length, 32);
    // The shadow keeps the feet anchored, whichever pose is shown.
    assert.ok(grid[31]?.some((cell) => cell === 'shadow'));
  }
});

test('mood changes the pose and level changes the tier', () => {
  const ready = buildCharacter({ level: 8, mood: 'ready', appearance: APPEARANCE });
  const radiant = buildCharacter({ level: 8, mood: 'radiant', appearance: APPEARANCE });
  assert.notDeepEqual(ready, radiant);

  const beginner = buildCharacter({ level: 3, mood: 'ready', appearance: APPEARANCE });
  const ascendant = buildCharacter({ level: 30, mood: 'ready', appearance: APPEARANCE });
  assert.notDeepEqual(beginner, ascendant);
  const flat = ascendant.flat();
  assert.ok(flat.includes('aura'), 'the top tier has an aura');
  assert.ok(!beginner.flat().includes('aura'));
});

test('hair and skin choices produce different artwork', () => {
  const coils = buildCharacter({ level: 8, mood: 'ready', appearance: APPEARANCE });
  const braids = buildCharacter({
    level: 8,
    mood: 'ready',
    appearance: { ...APPEARANCE, hair: 'braids' },
  });
  assert.notDeepEqual(coils, braids);
});

test('every mood has a defined pose', () => {
  for (const mood of MOODS) {
    const pose = poseForMood(mood);
    assert.ok(['down', 'up', 'out', 'pump'].includes(pose.leftArm));
    assert.ok(['open', 'closed', 'happy'].includes(pose.eyes));
  }
});

test('every interface glyph is a filled 12 by 12 mark', () => {
  for (const name of iconNames()) {
    const grid = buildIcon(name);
    assert.equal(grid.length, ICON_SIZE, `${name} height`);
    assert.equal(grid[0]?.length, ICON_SIZE, `${name} width`);
    const filled = pixelCount(grid);
    assert.ok(filled > 12, `${name} looks empty (${filled} pixels)`);
    assert.ok(filled < 120, `${name} looks like a block (${filled} pixels)`);
  }
});

test('icons and badges are usable as marks', () => {
  const chip = buildChip(3, 'sleepy');
  assert.equal(chip.length, 12);
  assert.ok(pixelCount(chip) > 20);

  const mark = buildMark(32);
  assert.equal(mark.length, 32);
  assert.ok(pixelCount(mark) > 60, 'the app mark is not blank');
});

import { tierForLevel, type AppearanceTier } from '../level';
import type { Appearance, Mood } from '../types';
import {
  createGrid,
  fillColumn,
  fillRect,
  fillRow,
  getPixel,
  gridFromStrings,
  scaleGrid,
  setPixel,
  type ColorKey,
  type Grid,
} from './grid';

/**
 * The companion.
 *
 * One 32×32 grid, drawn from parameters so every combination of level, mood,
 * skin, hair and outfit is original artwork that scales cleanly. The character
 * is deliberately friendly and neutral: levels change posture, clothing detail,
 * motion and eventually a little fantasy energy, never body size, and no mood
 * is drawn as illness or distress.
 *
 * The handoff suggests a 64×64 production frame. The shipped grid is 32×32 and
 * is always displayed at an integer scale, so it stays crisp; `docs/RELEASE.md`
 * records what a production sprite sheet would need to add.
 */

export const SPRITE_WIDTH = 32;
export const SPRITE_HEIGHT = 32;
export const GROUND_Y = 30;

export type ArmPose = 'down' | 'up' | 'out' | 'pump';
export type EyeStyle = 'open' | 'closed' | 'happy';
export type MouthStyle = 'smile' | 'flat' | 'small' | 'yawn';

export type PoseSpec = {
  bodyOffsetY: number;
  headOffsetY: number;
  leftArm: ArmPose;
  rightArm: ArmPose;
  legsSpread: number;
  eyes: EyeStyle;
  mouth: MouthStyle;
};

export function poseForMood(mood: Mood): PoseSpec {
  switch (mood) {
    case 'sleepy':
      return {
        bodyOffsetY: 1,
        headOffsetY: 1,
        leftArm: 'down',
        rightArm: 'down',
        legsSpread: 0,
        eyes: 'closed',
        mouth: 'yawn',
      };
    case 'warming':
      return {
        bodyOffsetY: 0,
        headOffsetY: 0,
        leftArm: 'out',
        rightArm: 'down',
        legsSpread: 0,
        eyes: 'open',
        mouth: 'flat',
      };
    case 'ready':
      return {
        bodyOffsetY: 0,
        headOffsetY: 0,
        leftArm: 'down',
        rightArm: 'down',
        legsSpread: 0,
        eyes: 'open',
        mouth: 'smile',
      };
    case 'energetic':
      return {
        bodyOffsetY: -1,
        headOffsetY: -1,
        leftArm: 'up',
        rightArm: 'up',
        legsSpread: 1,
        eyes: 'happy',
        mouth: 'smile',
      };
    case 'radiant':
      return {
        bodyOffsetY: -1,
        headOffsetY: -1,
        leftArm: 'up',
        rightArm: 'pump',
        legsSpread: 2,
        eyes: 'happy',
        mouth: 'smile',
      };
    default:
      return {
        bodyOffsetY: 0,
        headOffsetY: 0,
        leftArm: 'down',
        rightArm: 'down',
        legsSpread: 0,
        eyes: 'open',
        mouth: 'smile',
      };
  }
}

function drawLegs(grid: Grid, pose: PoseSpec, outfitColor: ColorKey): void {
  const spread = pose.legsSpread;
  const top = GROUND_Y - 7 + pose.bodyOffsetY;
  const bottom = GROUND_Y - 2 + pose.bodyOffsetY;
  fillRect(grid, 12 - spread, top, 3, bottom - top + 1, outfitColor);
  fillRect(grid, 17 + spread, top, 3, bottom - top + 1, outfitColor);
  // Shoes sit on the ground line.
  fillRect(grid, 11 - spread, GROUND_Y - 1, 5, 2, 'ink');
  fillRect(grid, 16 + spread, GROUND_Y - 1, 5, 2, 'ink');
  fillRect(grid, 11 - spread, GROUND_Y - 1, 5, 1, 'white');
  fillRect(grid, 16 + spread, GROUND_Y - 1, 5, 1, 'white');
}

function drawTorso(grid: Grid, pose: PoseSpec, tier: AppearanceTier): void {
  const top = GROUND_Y - 15 + pose.bodyOffsetY;
  const bottom = GROUND_Y - 7 + pose.bodyOffsetY;
  fillRect(grid, 10, top, 12, bottom - top + 1, 'outfit', { rounded: true });
  // A collar and one detail line keep the silhouette readable per tier.
  fillRow(grid, top, 14, 17, 'skinShade');
  if (tier === 'beginner') {
    fillRow(grid, top + 6, 10, 21, 'outfitShade');
  } else if (tier === 'rhythm') {
    fillRow(grid, top + 3, 12, 19, 'accent');
  } else {
    fillRow(grid, top + 3, 12, 19, 'accent');
    fillColumn(grid, 12, top + 6, top + 9, 'outfitShade');
    fillColumn(grid, 19, top + 6, top + 9, 'outfitShade');
  }
}

function drawArm(grid: Grid, pose: PoseSpec, side: 'left' | 'right', arm: ArmPose): void {
  const mirror = side === 'right';
  const shoulderY = GROUND_Y - 14 + pose.bodyOffsetY;
  const outerX = mirror ? 22 : 8;
  const innerX = mirror ? 21 : 9;
  switch (arm) {
    case 'down': {
      fillRect(grid, outerX, shoulderY, 2, 7, 'outfit');
      fillRect(grid, outerX, shoulderY + 7, 2, 2, 'skin');
      return;
    }
    case 'out': {
      fillRect(grid, outerX, shoulderY + 1, 3, 2, 'outfit');
      fillRect(grid, outerX + (mirror ? 2 : -2), shoulderY + 1, 2, 2, 'skin');
      fillRect(grid, innerX + (mirror ? -1 : 1), shoulderY + 1, 2, 4, 'outfit');
      return;
    }
    case 'up': {
      fillRect(grid, outerX, shoulderY - 6, 2, 7, 'outfit');
      fillRect(grid, outerX, shoulderY - 8, 2, 2, 'skin');
      return;
    }
    case 'pump': {
      fillRect(grid, outerX, shoulderY - 7, 2, 8, 'outfit');
      fillRect(grid, outerX, shoulderY - 9, 2, 2, 'skin');
      return;
    }
    default:
      return;
  }
}

function drawHead(grid: Grid, pose: PoseSpec): void {
  const top = GROUND_Y - 26 + pose.bodyOffsetY + pose.headOffsetY;
  fillRect(grid, 11, top, 10, 10, 'skin', { rounded: true });
  fillRect(grid, 10, top + 4, 1, 2, 'skin');
  fillRect(grid, 21, top + 4, 1, 2, 'skin');
  // Cheek shade on the outer columns keeps a flat fill from looking like a box.
  fillColumn(grid, 11, top + 2, top + 7, 'skinShade');
  fillColumn(grid, 20, top + 2, top + 7, 'skinShade');
}

function drawFace(grid: Grid, pose: PoseSpec, headTop: number): void {
  const eyeY = headTop + 4;
  const leftEyeX = 13;
  const rightEyeX = 17;
  const drawEye = (x: number) => {
    switch (pose.eyes) {
      case 'open':
        fillRect(grid, x, eyeY, 2, 2, 'ink');
        break;
      case 'closed':
        fillRow(grid, eyeY + 1, x, x + 1, 'ink');
        break;
      case 'happy':
        setPixel(grid, x, eyeY + 1, 'ink');
        setPixel(grid, x + 1, eyeY, 'ink');
        break;
      default:
        break;
    }
  };
  drawEye(leftEyeX);
  drawEye(rightEyeX);

  const mouthY = headTop + 7;
  switch (pose.mouth) {
    case 'smile':
      fillRow(grid, mouthY, 14, 17, 'ink');
      setPixel(grid, 13, mouthY - 1, 'ink');
      setPixel(grid, 18, mouthY - 1, 'ink');
      break;
    case 'flat':
      fillRow(grid, mouthY, 15, 16, 'ink');
      break;
    case 'small':
      setPixel(grid, 15, mouthY, 'ink');
      setPixel(grid, 16, mouthY, 'ink');
      break;
    case 'yawn':
      fillRect(grid, 15, mouthY - 1, 2, 3, 'ink');
      break;
    default:
      break;
  }
}

function drawHair(grid: Grid, style: Appearance['hair'], headTop: number, tier: AppearanceTier): void {
  const golden = tier === 'ascendant';
  const key: ColorKey = golden ? 'accent' : 'hair';
  const shade: ColorKey = golden ? 'accent' : 'hairShade';
  const capTop = headTop - 1;
  switch (style) {
    case 'coils':
      fillRect(grid, 10, capTop, 12, 4, key, { rounded: true });
      fillRow(grid, capTop - 1, 11, 20, key);
      fillRow(grid, capTop - 2, 13, 18, key);
      break;
    case 'waves':
      fillRect(grid, 10, capTop, 12, 4, key, { rounded: true });
      fillRect(grid, 10, capTop + 2, 4, 3, key);
      fillRow(grid, capTop + 1, 18, 21, shade);
      break;
    case 'crop':
      fillRect(grid, 11, capTop, 10, 2, key);
      fillRow(grid, capTop, 11, 20, shade);
      break;
    case 'braids':
      fillRect(grid, 10, capTop, 12, 3, key, { rounded: true });
      fillColumn(grid, 9, capTop + 2, capTop + 8, key);
      fillColumn(grid, 22, capTop + 2, capTop + 8, key);
      setPixel(grid, 9, capTop + 9, shade);
      setPixel(grid, 22, capTop + 9, shade);
      break;
    case 'puff':
      fillRect(grid, 10, capTop, 12, 3, key, { rounded: true });
      fillRect(grid, 9, capTop - 3, 14, 4, key, { rounded: true });
      fillRow(grid, capTop - 4, 12, 19, shade);
      break;
    default:
      break;
  }

  if (tier === 'radiant' || tier === 'ascendant') {
    // Rising hair: the silhouette lifts, drawn flush with the cap below it so
    // the shape always reads as one piece.
    const riseTop = capTop - 3;
    fillRect(grid, 12, riseTop, 8, capTop - riseTop, key);
    setPixel(grid, 12, riseTop, shade);
    setPixel(grid, 19, riseTop, shade);
    if (golden) {
      // An original spiky silhouette: Agon's own mark, not a borrowed one.
      fillColumn(grid, 12, capTop - 6, riseTop - 1, key);
      fillColumn(grid, 16, capTop - 7, riseTop - 1, key);
      fillColumn(grid, 19, capTop - 6, riseTop - 1, key);
      setPixel(grid, 14, capTop - 5, key);
      setPixel(grid, 18, capTop - 5, key);
    }
  }
}

function drawShadow(grid: Grid, pose: PoseSpec): void {
  const width = 12 + pose.legsSpread;
  const from = 16 - Math.floor(width / 2);
  fillRow(grid, SPRITE_HEIGHT - 1, from, from + width - 1, 'shadow');
}

function drawAura(grid: Grid, tier: AppearanceTier): void {
  if (tier === 'beginner' || tier === 'rhythm') return;
  const sparks: Array<[number, number]> = [[7, 11], [24, 12], [6, 19], [25, 20]];
  if (tier === 'athletic') {
    setPixel(grid, 7, 11, 'accentSoft');
    setPixel(grid, 24, 12, 'accentSoft');
  }
  if (tier === 'heroic') {
    for (const [x, y] of sparks.slice(0, 3)) setPixel(grid, x, y, 'accent');
    fillRow(grid, GROUND_Y + 1, 14, 17, 'accentSoft');
  }
  if (tier === 'radiant') {
    for (const [x, y] of sparks) setPixel(grid, x, y, 'accent');
    fillRow(grid, GROUND_Y + 1, 12, 19, 'accentSoft');
    setPixel(grid, 6, 15, 'accentSoft');
    setPixel(grid, 25, 16, 'accentSoft');
  }
  if (tier === 'ascendant') {
    for (const [x, y] of sparks) {
      setPixel(grid, x, y, 'accent');
      setPixel(grid, x, y + 1, 'accentSoft');
    }
    // A restrained aura: a low ring under the feet, never a neon column.
    fillRow(grid, GROUND_Y + 1, 10, 21, 'aura');
  }
}

export type CharacterOptions = {
  level: number;
  mood: Mood;
  appearance: Appearance;
};

export function buildCharacter(options: CharacterOptions): Grid {
  const tier = tierForLevel(options.level);
  const pose = poseForMood(options.mood);
  const grid = createGrid(SPRITE_WIDTH, SPRITE_HEIGHT);
  const levitating = tier === 'ascendant';
  const effectivePose: PoseSpec = levitating
    ? { ...pose, bodyOffsetY: pose.bodyOffsetY - 2, legsSpread: pose.legsSpread + 1 }
    : pose;

  drawShadow(grid, effectivePose);
  drawLegs(grid, effectivePose, 'outfitShade');
  if (levitating) {
    fillRow(grid, GROUND_Y - 1, 12, 20, 'aura');
  }
  drawArm(grid, effectivePose, 'left', effectivePose.leftArm);
  drawArm(grid, effectivePose, 'right', effectivePose.rightArm);
  drawTorso(grid, effectivePose, tier);
  drawHead(grid, effectivePose);
  const headTop = GROUND_Y - 26 + effectivePose.bodyOffsetY + effectivePose.headOffsetY;
  drawFace(grid, effectivePose, headTop);
  drawHair(grid, options.appearance.hair, headTop, tier);
  drawAura(grid, tier);
  return grid;
}

/** Small badge used beside the avatar in lists and on the completion screen. */
export function buildChip(level: number, mood: Mood): Grid {
  const grid = createGrid(12, 12);
  const tier = tierForLevel(level);
  fillRect(grid, 2, 4, 8, 7, 'outfit', { rounded: true });
  fillRect(grid, 3, 1, 6, 5, 'skin', { rounded: true });
  if (tier === 'ascendant') {
    fillRow(grid, 0, 4, 7, 'accent');
  } else {
    fillRow(grid, 1, 3, 8, 'hair');
  }
  const eyeY = 3;
  if (mood === 'sleepy') {
    fillRow(grid, eyeY + 1, 4, 5, 'ink');
    fillRow(grid, eyeY + 1, 7, 8, 'ink');
  } else {
    setPixel(grid, 4, eyeY, 'ink');
    setPixel(grid, 7, eyeY, 'ink');
  }
  return grid;
}

/**
 * The mark, drawn on a 16-unit grid: a peak over a horizon. It reads at icon
 * size, is unmistakably Agon's own, and scales by whole numbers only.
 */
export const MARK_ROWS: string[] = [
  '................',
  '................',
  '.......##.......',
  '......####......',
  '......####......',
  '.....######.....',
  '.....######.....',
  '....########....',
  '....########....',
  '...##########...',
  '...##########...',
  '..############..',
  '.++++++++++++++.',
  '................',
  '................',
  '................',
];

const MARK_PALETTE: Record<string, ColorKey | null> = {
  '.': null,
  '#': 'ink',
  '+': 'accent',
};

export function buildMark(size = 32): Grid {
  const base = gridFromStrings(MARK_ROWS, MARK_PALETTE, 16);
  const factor = Math.max(1, Math.round(size / 16));
  return factor === 1 ? base : scaleGrid(base, factor);
}

export function isPixelAt(grid: Grid, x: number, y: number): boolean {
  return getPixel(grid, x, y) !== null;
}

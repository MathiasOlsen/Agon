/**
 * Renders the pixel artwork to PNG sheets so it can be looked at rather than
 * guessed at, and so the app icons can be checked before they ship. Output goes
 * to `artifacts/`, which is git-ignored.
 *
 *   pnpm run preview
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCharacter, buildChip, buildMark } from '../src/core/pixels/character';
import type { ColorKey } from '../src/core/pixels/grid';
import { buildIcon, iconNames } from '../src/core/pixels/icons';
import type { Appearance, Mood, SkinTone } from '../src/core/types';
import { Canvas, rgb, type Rgba } from './lib/png';

const OAT = '#F7F7F2';
const TEAL = '#185B59';

const PALETTE: Record<string, Rgba> = {
  skin: rgb('#DEAF7E'),
  skinShade: rgb('#BC8C60'),
  hair: rgb('#3A2A24'),
  hairShade: rgb('#281C18'),
  outfit: rgb(TEAL),
  outfitShade: rgb('#263A3C'),
  ink: rgb('#202B2B'),
  accent: rgb('#F1AC80'),
  accentSoft: rgb('#F6CDB2'),
  white: rgb('#FFFFFF'),
  aura: rgb('#A9DCC8'),
  shadow: rgb('#D6D6CD'),
};

const SKIN: Record<SkinTone, [Rgba, Rgba]> = {
  sand: [rgb('#EBC9A5'), rgb('#CEA884')],
  honey: [rgb('#DEAF7E'), rgb('#BC8C60')],
  umber: [rgb('#A8704A'), rgb('#885638')],
  espresso: [rgb('#6E4A36'), rgb('#543728')],
};

const MOODS: Mood[] = ['sleepy', 'warming', 'ready', 'energetic', 'radiant'];
const LEVELS = [3, 8, 13, 18, 23, 28];
const APPEARANCES: Appearance[] = [
  { skin: 'sand', hair: 'coils', outfit: 'tee' },
  { skin: 'honey', hair: 'waves', outfit: 'tank' },
  { skin: 'umber', hair: 'crop', outfit: 'hoodie' },
  { skin: 'espresso', hair: 'braids', outfit: 'jacket' },
  { skin: 'honey', hair: 'puff', outfit: 'tee' },
];

const SCALE = 5;
const GAP = 8;
const CELL = 32 * SCALE;

function paletteFor(skin: SkinTone): Record<string, Rgba> {
  const [base, shade] = SKIN[skin];
  return { ...PALETTE, skin: base, skinShade: shade };
}

function main(): void {
  const directory = join(dirname(fileURLToPath(import.meta.url)), '..', 'artifacts');
  mkdirSync(directory, { recursive: true });

  // One sheet: every mood against several looks.
  const columns = MOODS.length * 2;
  const sheet = new Canvas(columns * (CELL + GAP) + GAP, LEVELS.length * (CELL + GAP) + GAP + 140, rgb(OAT));
  LEVELS.forEach((level, rowIndex) => {
    MOODS.forEach((mood, moodIndex) => {
      APPEARANCES.forEach((appearance, appearanceIndex) => {
        const column = moodIndex * 2 + appearanceIndex;
        if (column >= columns) return;
        sheet.drawGrid(
          buildCharacter({ level, mood, appearance }),
          GAP + column * (CELL + GAP),
          GAP + rowIndex * (CELL + GAP),
          SCALE,
          paletteFor(appearance.skin),
        );
      });
    });
  });

  const iconRow = GAP + LEVELS.length * (CELL + GAP) + 20;
  iconNames().forEach((name, index) => {
    sheet.drawGrid(
      buildIcon(name),
      GAP + index * 40,
      iconRow,
      2,
      PALETTE,
    );
  });
  sheet.drawGrid(buildChip(28, 'radiant'), GAP + iconNames().length * 40, iconRow, 2, PALETTE);
  sheet.drawGrid(buildChip(3, 'sleepy'), GAP + iconNames().length * 40 + 32, iconRow, 2, PALETTE);
  sheet.drawGrid(buildMark(32), GAP + iconNames().length * 40 + 80, iconRow, 2, PALETTE);
  writeFileSync(join(directory, 'sprites.png'), sheet.toPng());

  // A second sheet: one character per level band, at a scale worth judging.
  const tierLevels = [1, 6, 11, 16, 21, 26, 30];
  const tierScale = 8;
  const tierCell = 32 * tierScale;
  const tiers = new Canvas(
    tierLevels.length * (tierCell + GAP) + GAP,
    tierCell + GAP * 2,
    rgb(OAT),
  );
  tierLevels.forEach((level, index) => {
    const appearance = APPEARANCES[index % APPEARANCES.length] ?? APPEARANCES[0]!;
    tiers.drawGrid(
      buildCharacter({ level, mood: 'ready', appearance }),
      GAP + index * (tierCell + GAP),
      GAP,
      tierScale,
      paletteFor(appearance.skin),
    );
  });
  writeFileSync(join(directory, 'tiers.png'), tiers.toPng());

  console.log(`Wrote ${join(directory, 'sprites.png')}`);
  console.log(`Wrote ${join(directory, 'tiers.png')}`);
}

main();

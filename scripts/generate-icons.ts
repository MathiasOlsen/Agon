/**
 * Builds the app icons, splash mark and favicon from the same pixel mark the
 * interface uses, so the brand is one original drawing rather than a stock
 * asset. Run with `pnpm run icons`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMark } from '../src/core/pixels/character';
import { Canvas, rgb, type Rgba } from './lib/png';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'assets', 'images');

const OAT = '#F7F7F2';
const TEAL = '#185B59';
const APRICOT = '#F1AC80';

/** The mark on the teal field, used where a filled icon is expected. */
const TEAL_PALETTE: Record<string, Rgba> = {
  ink: rgb(OAT),
  accent: rgb(APRICOT),
};

/** The mark on transparency, used for the splash and the adaptive foreground. */
const CLEAR_PALETTE: Record<string, Rgba> = {
  ink: rgb(TEAL),
  accent: rgb(APRICOT),
};

/** A single-colour mark, used as Android's monochrome layer. */
const MONO_PALETTE: Record<string, Rgba> = {
  ink: rgb('#FFFFFF'),
  accent: rgb('#FFFFFF'),
};

function write(name: string, canvas: Canvas): void {
  mkdirSync(OUTPUT, { recursive: true });
  writeFileSync(join(OUTPUT, name), canvas.toPng());
  console.log(`  ${name} (${canvas.width}×${canvas.height})`);
}

function icon(size: number, palette: Record<string, Rgba>, background: Rgba | null, inset: number): Canvas {
  const canvas = new Canvas(size, size, background ?? [0, 0, 0, 0]);
  const markSize = 32;
  const scale = Math.max(1, Math.floor((size * inset) / markSize));
  const drawn = markSize * scale;
  canvas.drawGrid(buildMark(markSize), Math.floor((size - drawn) / 2), Math.floor((size - drawn) / 2), scale, palette);
  return canvas;
}

console.log('Writing icons to assets/images:');
write('icon.png', icon(1024, TEAL_PALETTE, rgb(TEAL), 0.72));
write('splash-icon.png', icon(512, CLEAR_PALETTE, null, 0.9));
write('favicon.png', icon(96, TEAL_PALETTE, rgb(TEAL), 0.68));
write('android-icon-foreground.png', icon(1024, TEAL_PALETTE, null, 0.55));
write('android-icon-background.png', new Canvas(1024, 1024, rgb(TEAL)));
write('android-icon-monochrome.png', icon(1024, MONO_PALETTE, null, 0.55));
console.log('Done.');

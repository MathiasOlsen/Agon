/**
 * The optional artwork pipeline.
 *
 * Agon ships with original pixel art generated from code, so this script is not
 * needed to build or run the app. It exists for producing concept artwork with
 * fal.ai using the key in `.env.local`, and it documents the two steps the
 * project uses: generate a picture, then cut its background out.
 *
 *   Generation:  fal-ai/nano-banana-2   or the gpt-image model on fal.ai
 *   Cut-out:     fal-ai/ideogram/remove-background
 *
 * Run with `pnpm run art -- "<prompt>"`. Output lands in `artifacts/`, which is
 * git-ignored: concept images are references, never shipped assets.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'artifacts');

const GENERATE_ENDPOINT = 'https://fal.run/fal-ai/nano-banana-2';
const CUTOUT_ENDPOINT = 'https://fal.run/fal-ai/ideogram/remove-background';

function readKey(): string {
  const file = join(ROOT, '.env.local');
  const contents = readFileSync(file, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = /^FAL_KEY=(.+)$/.exec(line.trim());
    if (match?.[1]) return match[1].trim();
  }
  throw new Error('FAL_KEY is not set in .env.local');
}

async function callFal(endpoint: string, key: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${endpoint} failed with ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

function firstImageUrl(payload: Record<string, unknown>): string {
  const images = payload.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0] as { url?: string };
    if (first?.url) return first.url;
  }
  const image = payload.image as { url?: string } | undefined;
  if (image?.url) return image.url;
  throw new Error('The response did not contain an image.');
}

async function download(url: string, name: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  mkdirSync(OUTPUT, { recursive: true });
  const target = join(OUTPUT, name);
  writeFileSync(target, buffer);
  return target;
}

async function main(): Promise<void> {
  const prompt = process.argv.slice(2).join(' ').trim();
  if (!prompt) {
    console.log('Usage: pnpm run art -- "a prompt describing the picture"');
    console.log('Nothing was generated.');
    return;
  }

  const key = readKey();
  console.log('Generating with fal-ai/nano-banana-2…');
  const generated = await callFal(GENERATE_ENDPOINT, key, { prompt, num_images: 1 });
  const sourceUrl = firstImageUrl(generated);
  const source = await download(sourceUrl, 'art-source.png');
  console.log(`  saved ${source}`);

  console.log('Removing the background with fal-ai/ideogram/remove-background…');
  const cut = await callFal(CUTOUT_ENDPOINT, key, { image_url: sourceUrl });
  const cutUrl = firstImageUrl(cut);
  const cutout = await download(cutUrl, 'art-cutout.png');
  console.log(`  saved ${cutout}`);
  console.log('Concept images stay in artifacts/. They are references, not shippable assets.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

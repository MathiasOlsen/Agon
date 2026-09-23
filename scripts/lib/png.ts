/**
 * A four-channel PNG writer, small enough to keep the repository free of image
 * dependencies. It exists so the pixel artwork in `src/core/pixels` can be
 * turned into real app icons and preview sheets, and so the sprite art can be
 * looked at during development.
 */

import { deflateSync } from 'node:zlib';

export type Rgba = [number, number, number, number];

export function rgb(hex: string, alpha = 255): Rgba {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean.slice(0, 6), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}

const crcTable = (() => {
  const table: number[] = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = (crc >>> 8) ^ (crcTable[(crc ^ byte) & 0xff] ?? 0);
  return (crc ^ 0xffffffff) >>> 0;
}

export class Canvas {
  readonly width: number;
  readonly height: number;
  private readonly pixels: Uint8Array;

  constructor(width: number, height: number, background: Rgba = [0, 0, 0, 0]) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4);
    for (let index = 0; index < width * height; index += 1) {
      this.setPixel(index % width, Math.floor(index / width), background);
    }
  }

  setPixel(x: number, y: number, color: Rgba): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const index = (y * this.width + x) * 4;
    this.pixels[index] = color[0];
    this.pixels[index + 1] = color[1];
    this.pixels[index + 2] = color[2];
    this.pixels[index + 3] = color[3];
  }

  fill(x: number, y: number, width: number, height: number, color: Rgba): void {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) this.setPixel(column, row, color);
    }
  }

  /** Draws a grid of colour keys at an integer scale: nearest-neighbour, always. */
  drawGrid(
    grid: Array<Array<string | null>>,
    originX: number,
    originY: number,
    scale: number,
    palette: Record<string, Rgba | undefined>,
  ): void {
    for (let y = 0; y < grid.length; y += 1) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x += 1) {
        const key = row[x];
        if (!key) continue;
        const color = palette[key];
        if (!color) continue;
        this.fill(originX + x * scale, originY + y * scale, scale, scale, color);
      }
    }
  }

  toPng(): Buffer {
    const stride = this.width * 4;
    const raw = Buffer.alloc((stride + 1) * this.height);
    for (let y = 0; y < this.height; y += 1) {
      raw[y * (stride + 1)] = 0;
      Buffer.from(this.pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
    }

    const chunk = (type: string, data: Buffer): Buffer => {
      const length = Buffer.alloc(4);
      length.writeUInt32BE(data.length, 0);
      const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(body), 0);
      return Buffer.concat([length, body, crc]);
    };

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

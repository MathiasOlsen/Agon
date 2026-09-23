/**
 * A tiny pixel canvas.
 *
 * Sprites are authored as grids of semantic colour keys rather than real
 * colours, so the same artwork works in all four themes and in every skin,
 * hair and outfit combination. Rendering happens at integer scale with
 * nearest-neighbour sampling, which is what keeps pixel art crisp.
 */

export type ColorKey =
  | 'skin'
  | 'skinShade'
  | 'hair'
  | 'hairShade'
  | 'outfit'
  | 'outfitShade'
  | 'ink'
  | 'accent'
  | 'accentSoft'
  | 'white'
  | 'aura'
  | 'shadow';

export type Grid = (ColorKey | null)[][];

export function createGrid(width: number, height: number): Grid {
  return Array.from({ length: height }, () => Array<ColorKey | null>(width).fill(null));
}

export function gridWidth(grid: Grid): number {
  return grid[0]?.length ?? 0;
}

export function gridHeight(grid: Grid): number {
  return grid.length;
}

export function inBounds(grid: Grid, x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < (grid[y]?.length ?? 0);
}

export function setPixel(grid: Grid, x: number, y: number, key: ColorKey | null): void {
  if (!inBounds(grid, x, y)) return;
  const row = grid[y];
  if (row) row[x] = key;
}

export function getPixel(grid: Grid, x: number, y: number): ColorKey | null {
  if (!inBounds(grid, x, y)) return null;
  return grid[y]?.[x] ?? null;
}

/** Fills a rectangle, optionally rounding the corners by one pixel. */
export function fillRect(
  grid: Grid,
  x: number,
  y: number,
  width: number,
  height: number,
  key: ColorKey | null,
  options: { rounded?: boolean } = {},
): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      if (options.rounded) {
        const cornerX = column === x || column === x + width - 1;
        const cornerY = row === y || row === y + height - 1;
        if (cornerX && cornerY) continue;
      }
      setPixel(grid, column, row, key);
    }
  }
}

export function fillColumn(grid: Grid, x: number, fromY: number, toY: number, key: ColorKey): void {
  for (let y = fromY; y <= toY; y += 1) setPixel(grid, x, y, key);
}

export function fillRow(grid: Grid, y: number, fromX: number, toX: number, key: ColorKey): void {
  for (let x = fromX; x <= toX; x += 1) setPixel(grid, x, y, key);
}

/**
 * Parses hand-authored art. Rows are padded or trimmed to `width`, so a stray
 * character in a sprite sheet cannot break the build.
 */
export function gridFromStrings(
  rows: string[],
  palette: Record<string, ColorKey | null>,
  width?: number,
): Grid {
  const targetWidth = width ?? Math.max(...rows.map((row) => row.length), 0);
  return rows.map((row) => {
    const padded = row.padEnd(targetWidth, ' ').slice(0, targetWidth);
    return Array.from(padded, (character) => palette[character] ?? null);
  });
}

export type Rect = { x: number; y: number; w: number; h: number; key: ColorKey };

/**
 * Greedy rectangle decomposition.
 *
 * A 32×32 character is around a thousand pixels; drawing one view per pixel
 * would be wasteful, so runs are merged rightwards and then downwards into as
 * few rectangles as possible. The result is deterministic, which is what the
 * tests check.
 */
export function toRects(grid: Grid): Rect[] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const consumed: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false),
  );
  const rects: Rect[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (consumed[y]?.[x]) continue;
      const key = grid[y]?.[x] ?? null;
      if (key === null) {
        const row = consumed[y];
        if (row) row[x] = true;
        continue;
      }
      let runWidth = 1;
      while (
        x + runWidth < width &&
        !consumed[y]?.[x + runWidth] &&
        grid[y]?.[x + runWidth] === key
      ) {
        runWidth += 1;
      }
      let runHeight = 1;
      while (y + runHeight < height) {
        let matches = true;
        for (let offset = 0; offset < runWidth; offset += 1) {
          if (
            consumed[y + runHeight]?.[x + offset] ||
            grid[y + runHeight]?.[x + offset] !== key
          ) {
            matches = false;
            break;
          }
        }
        if (!matches) break;
        runHeight += 1;
      }
      for (let rowIndex = y; rowIndex < y + runHeight; rowIndex += 1) {
        for (let column = x; column < x + runWidth; column += 1) {
          const row = consumed[rowIndex];
          if (row) row[column] = true;
        }
      }
      rects.push({ x, y, w: runWidth, h: runHeight, key });
    }
  }
  return rects;
}

export function pixelCount(grid: Grid): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) if (cell !== null) count += 1;
  }
  return count;
}

/** Mirrors a grid horizontally; used to reuse one arm or braid on both sides. */
export function mirrorGrid(grid: Grid): Grid {
  return grid.map((row) => [...row].reverse());
}

export function overlayGrid(base: Grid, overlay: Grid, offsetX = 0, offsetY = 0): Grid {
  for (let y = 0; y < overlay.length; y += 1) {
    const row = overlay[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x += 1) {
      const key = row[x];
      if (key) setPixel(base, x + offsetX, y + offsetY, key);
    }
  }
  return base;
}

export function scaleGrid(grid: Grid, factor: number): Grid {
  if (factor <= 1) return grid;
  const out: Grid = [];
  for (const row of grid) {
    const scaledRow: (ColorKey | null)[] = [];
    for (const cell of row) {
      for (let index = 0; index < factor; index += 1) scaledRow.push(cell);
    }
    for (let index = 0; index < factor; index += 1) out.push([...scaledRow]);
  }
  return out;
}

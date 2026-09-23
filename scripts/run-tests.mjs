/**
 * Runs every `*.test.ts` file under `src/` with Node's own test runner and the
 * project's TypeScript hooks. No test framework, no build step.
 */

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function collect(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = path.join(directory, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) found.push(...collect(full));
    else if (entry.endsWith('.test.ts')) found.push(full);
  }
  return found;
}

const tests = collect(path.join(root, 'src')).sort();
if (tests.length === 0) {
  console.error('No test files found under src/.');
  process.exit(1);
}

console.log(`Running ${tests.length} test file(s):`);
for (const test of tests) console.log(`  ${path.relative(root, test)}`);

const result = spawnSync(
  process.execPath,
  [
    '--import',
    './scripts/ts-loader.mjs',
    '--test',
    // Relative POSIX-style paths: Node reads a bare Windows path as a `c:` URL
    // scheme, and a file URL is not resolved by the test runner on Windows.
    ...tests.map((file) => path.relative(root, file).split(path.sep).join('/')),
  ],
  { stdio: 'inherit', cwd: root },
);

process.exit(result.status ?? 1);

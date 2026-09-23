import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BackupError,
  base64ToBytes,
  buildPayload,
  bytesToBase64,
  countsFor,
  decryptBackup,
  encryptBackup,
  previewRestore,
  readableExport,
} from './backup';
import { recompute, totalXp } from './engine';
import {
  TEST_NOW,
  deterministicRandom,
  makeModalityEvent,
  makeState,
  rewardTotal,
} from './test-support';

function sampleState() {
  const base = recompute(makeState(), TEST_NOW).state;
  return recompute(
    { ...base, activityEvents: [...base.activityEvents, makeModalityEvent({ localDate: '2026-09-21', modality: 'strength', minutes: 45 })] },
    TEST_NOW,
  ).state;
}

test('base64 survives a round trip, including every byte value', () => {
  const bytes = new Uint8Array(256);
  for (let index = 0; index < 256; index += 1) bytes[index] = index;
  assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes);

  const short = new Uint8Array([0, 1, 2]);
  assert.deepEqual(base64ToBytes(bytesToBase64(short)), short);
  assert.deepEqual(base64ToBytes(bytesToBase64(new Uint8Array([]))), new Uint8Array([]));
});

test('an encrypted backup round trips, and the file is not readable', () => {
  const state = sampleState();
  const payload = buildPayload(state, '1.0.0', TEST_NOW);
  const file = encryptBackup(payload, 'correct horse battery staple', deterministicRandom(11));

  assert.ok(!file.includes('build_your_strength'), 'the quest names are not in the clear');
  const parsed = JSON.parse(file) as Record<string, unknown>;
  assert.equal(parsed.format, BACKUP_FORMAT);
  assert.equal(parsed.formatVersion, BACKUP_FORMAT_VERSION);
  assert.ok(JSON.stringify(parsed.kdf).includes('scrypt'));
  assert.ok(!JSON.stringify(parsed).includes('correct horse'));

  const opened = decryptBackup(file, 'correct horse battery staple');
  assert.deepEqual(opened.payload.state, state);
  assert.equal(opened.payload.counts.activityEvents, countsFor(state).activityEvents);
  assert.equal(totalXp(opened.payload.state), rewardTotal(state));
});

test('the wrong passphrase changes nothing and says so plainly', () => {
  const file = encryptBackup(
    buildPayload(sampleState(), '1.0.0', TEST_NOW),
    'right',
    deterministicRandom(3),
  );
  assert.throws(
    () => decryptBackup(file, 'wrong'),
    (error: unknown) =>
      error instanceof BackupError && error.code === 'wrong_passphrase_or_corrupt',
  );
});

test('a damaged file cannot be opened either', () => {
  const file = encryptBackup(
    buildPayload(sampleState(), '1.0.0', TEST_NOW),
    'passphrase',
    deterministicRandom(5),
  );
  const envelope = JSON.parse(file) as { ciphertext: string };
  const flipped = `${envelope.ciphertext.slice(0, -4)}AAAA`;
  const damaged = JSON.stringify({ ...envelope, ciphertext: flipped });
  assert.throws(
    () => decryptBackup(damaged, 'passphrase'),
    (error: unknown) =>
      error instanceof BackupError && error.code === 'wrong_passphrase_or_corrupt',
  );
});

test('a newer Agon version is refused instead of guessed at', () => {
  const fresh = encryptBackup(
    buildPayload(sampleState(), '9.9.9', TEST_NOW),
    'passphrase',
    deterministicRandom(7),
  );
  const envelope = JSON.parse(fresh) as Record<string, unknown>;
  const future = JSON.stringify({ ...envelope, formatVersion: BACKUP_FORMAT_VERSION + 1 });
  assert.throws(
    () => decryptBackup(future, 'passphrase'),
    (error: unknown) => error instanceof BackupError && error.code === 'unsupported_format_version',
  );
});

test('a newer data schema is refused too', () => {
  const payload = buildPayload(sampleState(), '1.0.0', TEST_NOW);
  const file = encryptBackup(
    { ...payload, schemaVersion: payload.schemaVersion + 1 },
    'passphrase',
    deterministicRandom(13),
  );
  assert.throws(
    () => decryptBackup(file, 'passphrase'),
    (error: unknown) => error instanceof BackupError && error.code === 'unsupported_schema',
  );
});

test('a file that is not a backup is rejected before any crypto runs', () => {
  assert.throws(
    () => decryptBackup('{"hello":"world"}', 'passphrase'),
    (error: unknown) => error instanceof BackupError && error.code === 'not_a_backup',
  );
  assert.throws(
    () => decryptBackup('not json at all', 'passphrase'),
    (error: unknown) => error instanceof BackupError && error.code === 'not_a_backup',
  );
});

test('an empty passphrase is refused rather than accepted silently', () => {
  assert.throws(
    () => encryptBackup(buildPayload(sampleState(), '1.0.0', TEST_NOW), '', deterministicRandom(1)),
    (error: unknown) => error instanceof BackupError && error.code === 'wrong_passphrase_or_corrupt',
  );
});

test('the readable export is honest about what it is', () => {
  const state = sampleState();
  const text = readableExport(buildPayload(state, '1.0.0', TEST_NOW));
  const parsed = JSON.parse(text) as { contents: string; state: { activityEvents: unknown[] } };
  assert.match(parsed.contents, /not encrypted/i);
  assert.equal(parsed.state.activityEvents.length, state.activityEvents.length);
});

test('a restore preview describes the file without opening anything else', () => {
  const state = sampleState();
  const file = encryptBackup(buildPayload(state, '1.2.3', TEST_NOW), 'passphrase', deterministicRandom(17));
  const { payload } = decryptBackup(file, 'passphrase');
  const preview = previewRestore(payload);
  assert.equal(preview.appVersion, '1.2.3');
  assert.equal(preview.exportedAt, TEST_NOW);
  assert.equal(preview.counts.planSlots, state.planSlots.length);
});

test('restoring and recomputing lands on the same numbers', () => {
  const state = sampleState();
  const file = encryptBackup(buildPayload(state, '1.0.0', TEST_NOW), 'passphrase', deterministicRandom(19));
  const restored = decryptBackup(file, 'passphrase').payload.state;
  const recomputed = recompute(restored, TEST_NOW);
  assert.equal(recomputed.ops.length, 0, 'derived counters rebuild without new writes');
  assert.equal(rewardTotal(recomputed.state), rewardTotal(state));
});

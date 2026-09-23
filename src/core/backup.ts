import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { scrypt } from '@noble/hashes/scrypt.js';
import type { AgonState } from './types';

/**
 * Manual encrypted backup.
 *
 * The envelope records the format version, the key-derivation parameters, a
 * random salt and a nonce. It never records the passphrase or the derived key,
 * and nothing here invents cryptography: the KDF is scrypt and the cipher is
 * XChaCha20-Poly1305, both from the audited `@noble` libraries.
 *
 * Randomness is injected rather than imported so this module stays pure and can
 * be exercised in Node.
 */

export const BACKUP_FORMAT = 'agon.encrypted-backup';
export const BACKUP_FORMAT_VERSION = 1;
export const SCHEMA_VERSION = 1;

/** OWASP-style scrypt parameters, tuned down to what a phone can afford. */
export const KDF_PARAMS = { N: 32_768, r: 8, p: 1, dkLen: 32 } as const;
export const SALT_BYTES = 16;
export const NONCE_BYTES = 24;

export type RandomSource = (length: number) => Uint8Array;

export type BackupKdf = {
  name: 'scrypt';
  N: number;
  r: number;
  p: number;
  dkLen: number;
  salt: string;
};

export type BackupCipher = {
  name: 'xchacha20poly1305';
  nonce: string;
};

export type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  createdAt: string;
  app: { name: string; version: string };
  kdf: BackupKdf;
  cipher: BackupCipher;
  ciphertext: string;
};

export type BackupPayload = {
  schemaVersion: number;
  exportedAt: string;
  app: { name: string; version: string };
  /** The user can read this export, so it says plainly what it contains. */
  contents: string;
  counts: BackupCounts;
  state: AgonState;
};

export type BackupCounts = {
  questTemplates: number;
  questInstances: number;
  activityEvents: number;
  rewardEvents: number;
  scheduledSessions: number;
  workoutSessions: number;
  planSlots: number;
};

export type BackupErrorCode =
  | 'not_a_backup'
  | 'unsupported_format_version'
  | 'unsupported_schema'
  | 'wrong_passphrase_or_corrupt'
  | 'invalid_payload';

export class BackupError extends Error {
  readonly code: BackupErrorCode;

  constructor(code: BackupErrorCode, message: string) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Encoding helpers. Hand-rolled so the module needs no platform globals.
// ---------------------------------------------------------------------------

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    out += BASE64_ALPHABET[(triple >> 18) & 63];
    out += BASE64_ALPHABET[(triple >> 12) & 63];
    out += index + 1 < bytes.length ? BASE64_ALPHABET[(triple >> 6) & 63] : '=';
    out += index + 2 < bytes.length ? BASE64_ALPHABET[triple & 63] : '=';
  }
  return out;
}

export function base64ToBytes(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const length = Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
  const bytes = new Uint8Array(length);
  let byteIndex = 0;
  const valueAt = (index: number): number => {
    const character = clean[index];
    if (!character) return 0;
    const value = BASE64_ALPHABET.indexOf(character);
    return value < 0 ? 0 : value;
  };
  for (let index = 0; index < clean.length; index += 4) {
    const chunk =
      (valueAt(index) << 18) | (valueAt(index + 1) << 12) | (valueAt(index + 2) << 6) | valueAt(index + 3);
    if (byteIndex < length) bytes[byteIndex++] = (chunk >> 16) & 255;
    if (byteIndex < length) bytes[byteIndex++] = (chunk >> 8) & 255;
    if (byteIndex < length) bytes[byteIndex++] = chunk & 255;
  }
  return bytes;
}

export function utf8Bytes(value: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value);
  const escaped = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(escaped.length);
  for (let index = 0; index < escaped.length; index += 1) {
    bytes[index] = escaped.charCodeAt(index);
  }
  return bytes;
}

export function utf8String(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  let out = '';
  for (const byte of bytes) out += String.fromCharCode(byte);
  return decodeURIComponent(escape(out));
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Counts and previews
// ---------------------------------------------------------------------------

export function countsFor(state: AgonState): BackupCounts {
  return {
    questTemplates: state.questTemplates.length,
    questInstances: state.questInstances.length,
    activityEvents: state.activityEvents.filter((event) => event.deletedAt === null).length,
    rewardEvents: state.rewardEvents.filter((event) => event.reversedAt === null).length,
    scheduledSessions: state.scheduledSessions.length,
    workoutSessions: state.workoutSessions.length,
    planSlots: state.planSlots.length,
  };
}

export function buildPayload(state: AgonState, appVersion: string, now: string): BackupPayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    app: { name: 'Agon', version: appVersion },
    contents:
      'Your Agon settings, avatar, plan, quests, workouts, history and XP. No device permission tokens, no fonts or artwork.',
    counts: countsFor(state),
    state,
  };
}

// ---------------------------------------------------------------------------
// Encryption
// ---------------------------------------------------------------------------

export function deriveKey(
  passphrase: string,
  kdf: Pick<BackupKdf, 'N' | 'r' | 'p' | 'dkLen' | 'salt'>,
): Uint8Array {
  return scrypt(utf8Bytes(passphrase), base64ToBytes(kdf.salt), {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
    dkLen: kdf.dkLen,
  });
}

export function encryptBackup(
  payload: BackupPayload,
  passphrase: string,
  random: RandomSource,
): string {
  if (passphrase.length === 0) {
    throw new BackupError('wrong_passphrase_or_corrupt', 'A passphrase is required.');
  }
  const salt = random(SALT_BYTES);
  const nonce = random(NONCE_BYTES);
  const kdf: BackupKdf = {
    name: 'scrypt',
    N: KDF_PARAMS.N,
    r: KDF_PARAMS.r,
    p: KDF_PARAMS.p,
    dkLen: KDF_PARAMS.dkLen,
    salt: bytesToBase64(salt),
  };
  const key = deriveKey(passphrase, kdf);
  const cipher = xchacha20poly1305(key, nonce);
  const plaintext = utf8Bytes(JSON.stringify(payload));
  const ciphertext = cipher.encrypt(plaintext);
  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: payload.exportedAt,
    app: payload.app,
    kdf,
    cipher: { name: 'xchacha20poly1305', nonce: bytesToBase64(nonce) },
    ciphertext: bytesToBase64(ciphertext),
  };
  return JSON.stringify(envelope, null, 2);
}

export type DecryptResult = {
  payload: BackupPayload;
  envelope: BackupEnvelope;
};

export function decryptBackup(text: string, passphrase: string): DecryptResult {
  let envelope: BackupEnvelope;
  try {
    envelope = JSON.parse(text) as BackupEnvelope;
  } catch {
    throw new BackupError('not_a_backup', 'That file is not an Agon backup.');
  }
  if (envelope.format !== BACKUP_FORMAT) {
    throw new BackupError('not_a_backup', 'That file is not an Agon backup.');
  }
  if (envelope.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupError(
      'unsupported_format_version',
      'This backup was written by a newer version of Agon. Your data was not changed.',
    );
  }
  if (envelope.kdf?.name !== 'scrypt' || envelope.cipher?.name !== 'xchacha20poly1305') {
    throw new BackupError('not_a_backup', 'This backup uses a format Agon does not understand.');
  }

  const key = deriveKey(passphrase, envelope.kdf);
  let plaintext: Uint8Array;
  try {
    const cipher = xchacha20poly1305(key, base64ToBytes(envelope.cipher.nonce));
    plaintext = cipher.decrypt(base64ToBytes(envelope.ciphertext));
  } catch {
    // Authentication failure covers both a wrong passphrase and a damaged file.
    throw new BackupError(
      'wrong_passphrase_or_corrupt',
      'The passphrase did not open this backup, or the file is damaged. Your data was not changed.',
    );
  }

  let payload: BackupPayload;
  try {
    payload = JSON.parse(utf8String(plaintext)) as BackupPayload;
  } catch {
    throw new BackupError('invalid_payload', 'This backup could not be read.');
  }
  if (typeof payload.schemaVersion !== 'number' || payload.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError(
      'unsupported_schema',
      'This backup comes from a newer Agon data version. Your data was not changed.',
    );
  }
  if (!payload.state || typeof payload.state !== 'object') {
    throw new BackupError('invalid_payload', 'This backup does not contain Agon data.');
  }
  return { payload, envelope };
}

export type RestorePreview = {
  exportedAt: string;
  appVersion: string;
  schemaVersion: number;
  counts: BackupCounts;
};

export function previewRestore(payload: BackupPayload): RestorePreview {
  return {
    exportedAt: payload.exportedAt,
    appVersion: payload.app?.version ?? 'unknown',
    schemaVersion: payload.schemaVersion,
    counts: payload.counts ?? countsFor(payload.state),
  };
}

/** Plain, unencrypted export for portability. Deliberately a separate file. */
export function readableExport(payload: BackupPayload): string {
  return JSON.stringify(
    {
      ...payload,
      contents:
        'Readable Agon export. It is not encrypted: anyone who can open this file can read it.',
    },
    null,
    2,
  );
}

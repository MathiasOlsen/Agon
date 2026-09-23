/**
 * Local identifiers.
 *
 * IDs never leave the device and are never derived from anything personal, so
 * they cannot become network identifiers. Randomness is injected so tests can
 * be deterministic.
 */

export type RandomSource = (length: number) => Uint8Array;

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function encodeRandom(bytes: Uint8Array, length: number): string {
  let out = '';
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
    if (out.length >= length) break;
  }
  return out.padEnd(length, '0');
}

export function createId(
  prefix: string,
  random: RandomSource,
  now: number = Date.now(),
  length = 12,
): string {
  const time = Math.floor(now).toString(36);
  const noise = encodeRandom(random(Math.ceil(length / 1.6)), Math.ceil(length * 0.6));
  return `${prefix}_${time}${noise}`;
}

/** Reward keys are derived, not random: that is what makes granting idempotent. */
export function questRewardKey(instanceId: string): string {
  return `quest:${instanceId}`;
}

export function bonusRewardKey(localDate: string): string {
  return `bonus:${localDate}`;
}

export function reversalKey(rewardId: string): string {
  return `reversal:${rewardId}`;
}

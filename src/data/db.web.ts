import type { StorageTable } from './schema';

/**
 * The browser edition of the local store.
 *
 * On iOS and Android the app owns a SQLite database in private storage. A
 * browser has no such thing, so this provides the same operations on top of the
 * browser's own key-value storage, with the two guarantees the rest of the app
 * relies on:
 *
 *   1. A mutation is all-or-nothing. Writes are buffered and applied only once
 *      the whole mutation succeeded, and a failure while applying them puts the
 *      previous values back.
 *   2. Nothing leaves the device. The data lives in this browser profile and is
 *      gone when the profile is cleared.
 *
 * The handoff defers a browser release, so this exists to make a desktop preview
 * possible; the shipped products are the native apps. `docs/RELEASE.md` records
 * the difference.
 */

export const DATABASE_NAME = 'agon.web';

const PREFIX = 'agon:';

type Backend = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
};

function localStorageBackend(): Backend | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    // Touching it proves it is usable: some browsers throw in private mode.
    const probe = `${PREFIX}probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch {
    return null;
  }
  return {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
    remove: (key) => localStorage.removeItem(key),
    keys: () => {
      const keys: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key !== null) keys.push(key);
      }
      return keys;
    },
  };
}

function memoryBackend(): Backend {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
    keys: () => [...map.keys()],
  };
}

const backend: Backend = localStorageBackend() ?? memoryBackend();

/** Writes not yet committed, populated only while a mutation is running. */
let pending: Map<string, string | null> | null = null;

function storageKey(table: StorageTable, id: string): string {
  return `${PREFIX}${table}:${id}`;
}

function tablePrefix(table: StorageTable): string {
  return `${PREFIX}${table}:`;
}

export function withTransaction(work: () => void): void {
  const outer = pending;
  const buffered = new Map<string, string | null>();
  pending = buffered;
  try {
    work();
  } catch (error) {
    pending = outer;
    throw error;
  }
  pending = outer;

  // Nested transactions feed the enclosing one; otherwise writes go to storage.
  const target = outer
    ? {
        set: (key: string, value: string) => outer.set(key, value),
        remove: (key: string) => {
          outer.set(key, null);
        },
      }
    : {
        set: (key: string, value: string) => backend.set(key, value),
        remove: (key: string) => backend.remove(key),
      };
  const undo: Array<{ key: string; value: string | null }> = [];
  try {
    for (const [key, value] of buffered) {
      undo.push({ key, value: outer ? (outer.get(key) ?? null) : backend.get(key) });
      if (value === null) target.remove(key);
      else target.set(key, value);
    }
  } catch (error) {
    // Storage refused a write, most often because it is full. Put back what
    // changed so the previous state is the one that survives.
    for (const entry of undo) {
      try {
        if (entry.value === null) target.remove(entry.key);
        else target.set(entry.key, entry.value);
      } catch {
        // Nothing further can be done here; the caller reports the failure.
      }
    }
    throw error;
  }
}

export function readTable(table: StorageTable): string[] {
  const prefix = tablePrefix(table);
  return backend
    .keys()
    .filter((key) => key.startsWith(prefix))
    .map((key) => backend.get(key))
    .filter((value): value is string => value !== null);
}

export function writeJson(table: StorageTable, id: string, json: string): void {
  const key = storageKey(table, id);
  if (pending) pending.set(key, json);
  else backend.set(key, json);
}

export function deleteRow(table: StorageTable, id: string): void {
  const key = storageKey(table, id);
  if (pending) pending.set(key, null);
  else backend.remove(key);
}

export function clearAll(): void {
  for (const key of backend.keys()) {
    if (!key.startsWith(PREFIX)) continue;
    if (pending) pending.set(key, null);
    else backend.remove(key);
  }
}

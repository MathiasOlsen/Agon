import * as SQLite from 'expo-sqlite';

import { MIGRATIONS, SCHEMA_VERSION, TABLES, type StorageTable } from './schema';

/**
 * The local database.
 *
 * Everything happens on this device, in app-private storage. Writes go through
 * one transaction per mutation, so a mutation either lands completely or not at
 * all, and a failed write leaves the previous state untouched.
 */

export const DATABASE_NAME = 'agon.db';

let database: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (database) return database;
  const opened = SQLite.openDatabaseSync(DATABASE_NAME);
  opened.execSync('PRAGMA journal_mode = WAL;');
  opened.execSync('PRAGMA foreign_keys = ON;');
  migrate(opened);
  database = opened;
  return opened;
}

export function migrate(db: SQLite.SQLiteDatabase): void {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;
  for (let version = current; version < SCHEMA_VERSION; version += 1) {
    const migration = MIGRATIONS[version];
    if (migration) migration(db);
  }
  if (current !== SCHEMA_VERSION) {
    db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
}

export function withTransaction(work: () => void): void {
  getDatabase().withTransactionSync(work);
}

export function readTable(table: StorageTable): string[] {
  const rows = getDatabase().getAllSync<{ json: string }>(`SELECT json FROM "${table}";`);
  return rows.map((row) => row.json);
}

export function writeJson(table: StorageTable, id: string, json: string): void {
  getDatabase().runSync(
    `INSERT OR REPLACE INTO "${table}" (id, json) VALUES (?, ?);`,
    [id, json],
  );
}

export function deleteRow(table: StorageTable, id: string): void {
  getDatabase().runSync(`DELETE FROM "${table}" WHERE id = ?;`, [id]);
}

export function clearAll(): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    for (const table of TABLES) db.runSync(`DELETE FROM "${table}";`);
    db.runSync('DELETE FROM "preferences";');
    db.runSync('DELETE FROM "backup_metadata";');
    db.runSync('DELETE FROM meta;');
  });
}

export function readMeta(key: string): string | null {
  const row = getDatabase().getFirstSync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?;',
    [key],
  );
  return row?.value ?? null;
}

export function writeMeta(key: string, value: string): void {
  getDatabase().runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);', [key, value]);
}

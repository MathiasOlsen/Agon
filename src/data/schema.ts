/**
 * Storage schema.
 *
 * Each logical table keeps one JSON document per record. That keeps the store
 * transactional and migration-friendly: a schema change is a change to a
 * document, not a rewrite of columns, and nothing about the shape of the data
 * leaks into SQL. The volume here is a person's own training history, so
 * indexes and joins would be ceremony rather than speed.
 */

export const SCHEMA_VERSION = 1;

export const TABLES = [
  'plan_slots',
  'quest_templates',
  'quest_instances',
  'activity_events',
  'reward_events',
  'scheduled_sessions',
  'workout_templates',
  'workout_sessions',
  'set_logs',
  'cardio_logs',
] as const;

export type StorageTable = (typeof TABLES)[number] | 'preferences' | 'backup_metadata';

export const SINGLETON_TABLES = ['preferences', 'backup_metadata'] as const;

function createRecordTableSql(table: string): string {
  return `CREATE TABLE IF NOT EXISTS "${table}" (
    id TEXT PRIMARY KEY NOT NULL,
    json TEXT NOT NULL
  );`;
}

export function migrationOne(): string[] {
  return TABLES.map(createRecordTableSql);
}

export const MIGRATIONS: ReadonlyArray<(db: { execSync: (sql: string) => void }) => void> = [
  (db) => {
    for (const statement of migrationOne()) db.execSync(statement);
    db.execSync(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`);
  },
];

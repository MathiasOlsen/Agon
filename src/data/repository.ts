import type { AgonState, Op } from '@/core/types';

import { clearAll, deleteRow, readTable, withTransaction, writeJson } from './db';
import { SINGLETON_TABLES, type StorageTable } from './schema';

/**
 * Loading and saving whole records. The store applies a mutation's operations
 * in one transaction and then keeps the returned snapshot in memory, so the
 * interface never reads a half-written state.
 */

function tableName(table: string): StorageTable {
  return table as StorageTable;
}

function parseAll<T>(table: StorageTable): T[] {
  return readTable(table).map((json) => JSON.parse(json) as T);
}

function parseSingleton<T>(table: StorageTable): T | null {
  const rows = readTable(table);
  const first = rows[0];
  return first ? (JSON.parse(first) as T) : null;
}

export function loadStoredState(): {
  preferences: AgonState['preferences'] | null;
  backup: AgonState['backup'] | null;
  collections: Pick<
    AgonState,
    | 'planSlots'
    | 'questTemplates'
    | 'questInstances'
    | 'activityEvents'
    | 'rewardEvents'
    | 'scheduledSessions'
    | 'workoutTemplates'
    | 'workoutSessions'
    | 'setLogs'
    | 'cardioLogs'
  >;
} {
  return {
    preferences: parseSingleton<AgonState['preferences']>('preferences'),
    backup: parseSingleton<AgonState['backup']>('backup_metadata'),
    collections: {
      planSlots: parseAll<AgonState['planSlots'][number]>('plan_slots'),
      questTemplates: parseAll<AgonState['questTemplates'][number]>('quest_templates'),
      questInstances: parseAll<AgonState['questInstances'][number]>('quest_instances'),
      activityEvents: parseAll<AgonState['activityEvents'][number]>('activity_events'),
      rewardEvents: parseAll<AgonState['rewardEvents'][number]>('reward_events'),
      scheduledSessions: parseAll<AgonState['scheduledSessions'][number]>('scheduled_sessions'),
      workoutTemplates: parseAll<AgonState['workoutTemplates'][number]>('workout_templates'),
      workoutSessions: parseAll<AgonState['workoutSessions'][number]>('workout_sessions'),
      setLogs: parseAll<AgonState['setLogs'][number]>('set_logs'),
      cardioLogs: parseAll<AgonState['cardioLogs'][number]>('cardio_logs'),
    },
  };
}

const SINGLETON_LABEL: Record<string, string> = {
  preferences: 'preferences',
  backup_metadata: 'backup_metadata',
};

export function applyOps(ops: Op[]): void {
  if (ops.length === 0) return;
  withTransaction(() => {
    for (const op of ops) {
      const table = tableName(op.table);
      if (op.kind === 'put') {
        const isSingleton = (SINGLETON_TABLES as readonly string[]).includes(op.table);
        const id = isSingleton ? (SINGLETON_LABEL[op.table] ?? op.table) : singletonIdOf(op.record);
        writeJson(table, id, JSON.stringify(op.record));
      } else {
        deleteRow(table, op.id);
      }
    }
  });
}

function singletonIdOf(record: Record<string, unknown>): string {
  const id = record.id;
  if (typeof id === 'string' && id.length > 0) return id;
  throw new Error('Every stored record needs an id.');
}

/** Restoring replaces everything in one transaction: no half-restored states. */
export function replaceEverything(state: AgonState): void {
  clearAll();
  withTransaction(() => {
    writeJson('preferences', 'preferences', JSON.stringify(state.preferences));
    writeJson('backup_metadata', 'backup_metadata', JSON.stringify(state.backup));
    const groups: Array<[StorageTable, Array<{ id: string }>]> = [
      ['plan_slots', state.planSlots],
      ['quest_templates', state.questTemplates],
      ['quest_instances', state.questInstances],
      ['activity_events', state.activityEvents],
      ['reward_events', state.rewardEvents],
      ['scheduled_sessions', state.scheduledSessions],
      ['workout_templates', state.workoutTemplates],
      ['workout_sessions', state.workoutSessions],
      ['set_logs', state.setLogs],
      ['cardio_logs', state.cardioLogs],
    ];
    for (const [table, records] of groups) {
      for (const record of records) writeJson(table, record.id, JSON.stringify(record));
    }
  });
}

export function deleteEverything(): void {
  clearAll();
}

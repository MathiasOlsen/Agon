import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { SCHEMA_VERSION } from '@/data/schema';
import { countsFor } from '@/core/backup';
import type { AgonState } from '@/core/types';

/**
 * A redacted report, and only when someone asks for one.
 *
 * It carries versions and non-personal counts, never the workout database, the
 * log entries or the nickname. Nothing is uploaded automatically: the preview is
 * what the person chooses to share.
 */

export type DiagnosticReport = {
  generatedAt: string;
  app: { name: string; version: string; build: string | null };
  platform: { os: string; version: string };
  schema: { database: number; backup: number };
  counts: Record<string, number>;
  includes: string[];
  excludes: string[];
};

export function buildDiagnosticReport(state: AgonState): DiagnosticReport {
  return {
    generatedAt: new Date().toISOString(),
    app: {
      name: 'Agon',
      version: Application.nativeApplicationVersion ?? 'unknown',
      build: Application.nativeBuildVersion ?? null,
    },
    platform: {
      os: Platform.OS,
      version: String(Platform.Version),
    },
    schema: { database: SCHEMA_VERSION, backup: state.backup.formatVersion },
    counts: {
      ...countsFor(state),
      levelsEarned: 0,
    },
    includes: ['app and system versions', 'schema versions', 'row counts'],
    excludes: ['workout records', 'activity history', 'nickname', 'backup files', 'identifiers'],
  };
}

export function diagnosticReportText(report: DiagnosticReport): string {
  return JSON.stringify(report, null, 2);
}

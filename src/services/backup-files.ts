import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Saving and choosing files.
 *
 * The backup is written to the app's own cache and then handed to the system
 * share sheet, so the person decides where it goes — their files, their cloud,
 * their own choice. Agon never sees the file again.
 */

export const BACKUP_MIME = 'application/json';

export type SaveResult = {
  /** True once the file exists on this device and the share sheet was offered. */
  saved: boolean;
  uri: string | null;
  /** The share sheet was dismissed or unavailable; the file still exists. */
  shared: boolean;
};

export async function saveTextFile(params: {
  name: string;
  contents: string;
  mimeType?: string;
  dialogTitle?: string;
}): Promise<SaveResult> {
  const file = new File(Paths.cache, params.name);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  file.write(params.contents);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return { saved: true, uri: file.uri, shared: false };
  await Sharing.shareAsync(file.uri, {
    mimeType: params.mimeType ?? BACKUP_MIME,
    dialogTitle: params.dialogTitle,
  });
  return { saved: true, uri: file.uri, shared: true };
}

export async function pickTextFile(): Promise<{ name: string; contents: string } | null> {
  const picked = await File.pickFileAsync();
  if (picked.canceled || !picked.result) return null;
  const file = picked.result;
  const contents = await file.text();
  return { name: file.name ?? 'agon-backup', contents };
}

export function backupFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `agon-backup-${stamp}.agon`;
}

export function readableFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `agon-export-${stamp}.json`;
}

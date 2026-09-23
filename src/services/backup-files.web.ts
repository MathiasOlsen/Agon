/**
 * Saving and choosing files, in a browser.
 *
 * The native version hands the file to the system share sheet. A browser has no
 * share sheet, so this downloads the file instead and reads one back through the
 * usual file picker. The rest of the app does not know the difference, which
 * means the encrypted backup can be exercised in the desktop preview rather than
 * only on a device.
 */

export const BACKUP_MIME = 'application/json';

export type SaveResult = {
  saved: boolean;
  uri: string | null;
  shared: boolean;
};

export async function saveTextFile(params: {
  name: string;
  contents: string;
  mimeType?: string;
  dialogTitle?: string;
}): Promise<SaveResult> {
  const blob = new Blob([params.contents], { type: params.mimeType ?? BACKUP_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = params.name;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // The download keeps reading the blob until the browser has it.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return { saved: true, uri: url, shared: true };
}

export async function pickTextFile(): Promise<{ name: string; contents: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.agon,.json,application/json';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        input.remove();
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        input.remove();
        resolve({ name: file.name, contents: String(reader.result ?? '') });
      };
      reader.onerror = () => {
        input.remove();
        reject(new Error('Could not read that file.'));
      };
      reader.readAsText(file);
    });

    // A cancelled picker never fires an event, so the promise stays pending and
    // the screen simply stays as it was. That is a browser limitation, not a bug.
    document.body.appendChild(input);
    input.click();
  });
}

export function backupFileName(now: Date = new Date()): string {
  return `agon-backup-${now.toISOString().slice(0, 10)}.agon`;
}

export function readableFileName(now: Date = new Date()): string {
  return `agon-export-${now.toISOString().slice(0, 10)}.json`;
}

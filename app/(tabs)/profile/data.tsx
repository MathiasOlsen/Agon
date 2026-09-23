import { useState } from 'react';
import { Alert, View } from 'react-native';
import * as Application from 'expo-application';

import {
  BackupError,
  buildPayload,
  decryptBackup,
  encryptBackup,
  previewRestore,
  readableExport,
  type BackupPayload,
  type RestorePreview,
} from '@/core/backup';
import { formatLocalDate, formatLocalTimeOfDay } from '@/core/dates';
import { backupFileName, pickTextFile, readableFileName, saveTextFile } from '@/services/backup-files';
import { useApp } from '@/state/app-provider';
import { randomBytes } from '@/state/defaults';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { Field } from '@/ui/controls';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

const MIN_PASSPHRASE = 8;

/** Reported in the backup so a restore can explain which build wrote it. */
const APP_VERSION = Application.nativeApplicationVersion ?? '1.0.0';

/**
 * Yours, always.
 *
 * A backup is encrypted with the person's own passphrase before it leaves the
 * app, written to storage they choose, and never seen by Agon. Restoring
 * replaces local data in one transaction, and every failure path leaves the
 * current data exactly as it was.
 */

export default function DataScreen() {
  const { store, state, t } = useApp();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ payload: BackupPayload; preview: RestorePreview } | null>(
    null,
  );

  const now = () => new Date().toISOString();

  const messageFor = (thrown: unknown): string => {
    if (thrown instanceof BackupError) {
      switch (thrown.code) {
        case 'not_a_backup':
          return t('error.notABackup');
        case 'unsupported_format_version':
        case 'unsupported_schema':
          return t('error.unsupportedVersion');
        case 'invalid_payload':
          return t('error.invalidPayload');
        default:
          return t('error.wrongPassphrase');
      }
    }
    if (thrown instanceof Error && thrown.message === 'no-share') {
      return t('error.noShare');
    }
    return t('error.storageWrite');
  };

  const createBackup = async () => {
    setError(null);
    setStatus(null);
    if (passphrase.length < MIN_PASSPHRASE) {
      setError(t('data.passphraseTooShort'));
      return;
    }
    if (passphrase !== confirmation) {
      setError(t('data.passphraseMismatch'));
      return;
    }
    setBusy(true);
    try {
      const exportedAt = now();
      const text = encryptBackup(
        buildPayload(store.getState(), APP_VERSION, exportedAt),
        passphrase,
        randomBytes,
      );
      await saveTextFile({
        name: backupFileName(),
        contents: text,
        dialogTitle: t('data.createBackup'),
      });
      store.markExported(exportedAt);
      setStatus(t('data.backupCreated'));
      setPassphrase('');
      setConfirmation('');
    } catch (thrown) {
      setError(messageFor(thrown));
    } finally {
      setBusy(false);
    }
  };

  const createReadable = async () => {
    setError(null);
    try {
      await saveTextFile({
        name: readableFileName(),
        contents: readableExport(buildPayload(store.getState(), APP_VERSION, now())),
        dialogTitle: t('data.readableExport'),
      });
      setStatus(t('data.readableExportHint'));
    } catch (thrown) {
      setError(messageFor(thrown));
    }
  };

  const chooseFile = async () => {
    setError(null);
    setStatus(null);
    setOpened(null);
    try {
      const picked = await pickTextFile();
      setChosen(picked ? picked.contents : null);
    } catch (thrown) {
      setError(messageFor(thrown));
    }
  };

  const openBackup = () => {
    if (!chosen) return;
    setError(null);
    try {
      const { payload } = decryptBackup(chosen, passphrase);
      setOpened({ payload, preview: previewRestore(payload) });
    } catch (thrown) {
      setError(messageFor(thrown));
    }
  };

  const replaceEverything = () => {
    if (!opened) return;
    store.restore(opened.payload.state, now());
    setOpened(null);
    setChosen(null);
    setStatus(t('data.restored'));
  };

  const confirmDelete = () => {
    Alert.alert(t('data.deleteTitle'), t('data.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('data.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          store.wipe();
          setStatus(t('data.deleted'));
        },
      },
    ]);
  };

  const lastExport = state.backup.lastExportedAt;

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text variant="display">{t('data.title')}</Text>
        <Text variant="body" tone="muted">
          {t('data.subtitle')}
        </Text>
        <Text variant="caption" tone="muted" tabular>
          {lastExport
            ? t('data.lastExport', {
                date: `${formatLocalDate(lastExport.slice(0, 10), state.preferences.locale)} ${formatLocalTimeOfDay(
                  lastExport,
                  state.preferences.timeZone,
                  state.preferences.locale,
                )}`,
              })
            : t('data.neverExported')}
        </Text>
      </View>

      {status ? (
        <Card>
          <Text variant="label" tone="success" selectable>
            {status}
          </Text>
        </Card>
      ) : null}
      {error ? (
        <Card>
          <Text variant="label" tone="danger" selectable>
            {error}
          </Text>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={t('data.createBackup')} subtitle={t('data.createBackupHint')} />
        <Field
          label={t('data.passphrase')}
          value={passphrase}
          onChangeText={setPassphrase}
          secureTextEntry
          autoCapitalize="none"
          hint={t('data.passphraseHint')}
        />
        <Field
          label={t('data.passphraseConfirm')}
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoCapitalize="none"
        />
        <Button label={t('data.export')} onPress={() => void createBackup()} busy={busy} />
        <Text variant="caption" tone="muted">
          {t('data.notStored')} {t('data.exportNotFinished')}
        </Text>
      </Card>

      <Card>
        <CardHeader title={t('data.restoreBackup')} subtitle={t('data.restoreBackupHint')} />
        {opened ? (
          <View style={{ gap: 12 }}>
            <Text variant="label" selectable>
              {t('data.restoreFrom', {
                date: formatLocalDate(
                  opened.preview.exportedAt.slice(0, 10),
                  state.preferences.locale,
                ),
              })}
            </Text>
            <Text variant="caption" tone="muted" tabular>
              {t('data.restoreCounts', {
                quests: opened.preview.counts.questInstances,
                events: opened.preview.counts.activityEvents,
                xp: opened.preview.counts.rewardEvents,
              })}
            </Text>
            <Text variant="caption" tone="danger">
              {t('data.restoreWarning')}
            </Text>
            <Button label={t('data.restoreConfirm')} variant="danger" onPress={replaceEverything} />
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => {
                setOpened(null);
                setStatus(t('data.restoreCancelled'));
              }}
            />
          </View>
        ) : (
          <>
            <Button label={t('data.import')} variant="secondary" onPress={() => void chooseFile()} />
            <Field
              label={t('data.passphrase')}
              value={passphrase}
              onChangeText={setPassphrase}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button
              label={t('data.restorePreview')}
              disabled={!chosen || passphrase.length === 0}
              onPress={openBackup}
            />
          </>
        )}
      </Card>

      <Card>
        <CardHeader title={t('data.readableExport')} subtitle={t('data.readableExportHint')} />
        <Button
          label={t('data.readableExport')}
          variant="secondary"
          onPress={() => void createReadable()}
        />
      </Card>

      <Card>
        <CardHeader title={t('data.deviceBackup')} subtitle={t('data.deviceBackupHint')} />
        <Text variant="caption" tone="muted">
          {t('data.instructionsBody')}
        </Text>
      </Card>

      <Card>
        <CardHeader title={t('data.deleteLocal')} subtitle={t('data.noRecoveryCopy')} />
        <Button label={t('data.deleteLocal')} variant="danger" onPress={confirmDelete} />
      </Card>
    </Screen>
  );
}

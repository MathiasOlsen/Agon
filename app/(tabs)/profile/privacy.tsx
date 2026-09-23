import { useState } from 'react';
import { View } from 'react-native';

import { buildDiagnosticReport, diagnosticReportText } from '@/services/diagnostics';
import { saveTextFile } from '@/services/backup-files';
import { useApp } from '@/state/app-provider';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

/**
 * The privacy screen states what the architecture actually does. Nothing here is
 * a claim that a device can never be compromised — it is a description of what
 * Agon does and does not do with personal records.
 */

export default function PrivacyScreen() {
  const { state, t } = useApp();
  const [preview, setPreview] = useState<string | null>(null);

  const statements = [
    t('privacy.localOnly'),
    t('privacy.noAccount'),
    t('privacy.noTracking'),
    t('privacy.noCompanyCopy'),
  ];

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text variant="display">{t('privacy.headline')}</Text>
        <Text variant="body" tone="muted">
          {t('privacy.localOnly')}
        </Text>
      </View>

      <Card>
        {statements.map((statement) => (
          <Text key={statement} variant="label" selectable>
            {statement}
          </Text>
        ))}
      </Card>

      <Card>
        <CardHeader title={t('profile.data')} />
        <Text variant="caption" tone="muted" selectable>
          {t('privacy.cloudBackup')}
        </Text>
        <Text variant="caption" tone="muted" selectable>
          {t('privacy.hosting')}
        </Text>
      </Card>

      <Card>
        <CardHeader title={t('privacy.diagnostics')} subtitle={t('privacy.diagnosticsBody')} />
        <Button
          label={t('privacy.reportPreview')}
          variant="secondary"
          onPress={() => setPreview(diagnosticReportText(buildDiagnosticReport(state)))}
        />
        {preview ? (
          <>
            <Text variant="caption" selectable>
              {preview}
            </Text>
            <Button
              label={t('privacy.createReport')}
              onPress={() =>
                void saveTextFile({
                  name: 'agon-diagnostics.json',
                  contents: preview,
                  dialogTitle: t('privacy.createReport'),
                })
              }
            />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

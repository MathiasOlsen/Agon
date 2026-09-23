import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { CATALOGUE, type CatalogueEntry } from '@/core/catalogue';
import { isDefaultTemplateEnabled } from '@/core/engine';
import { rewardForQuest } from '@/core/rewards';
import { useApp } from '@/state/app-provider';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { Stepper, ToggleRow } from '@/ui/controls';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

/**
 * Adding and editing goals. The catalogue is offered as choices, never as a list
 * of obligations: one main goal per period is enough, and supporting goals add
 * recognition rather than unlimited XP.
 */

export default function AddQuest() {
  const { store, state, t } = useApp();
  const router = useRouter();
  const now = new Date().toISOString();
  const [targets, setTargets] = useState<Record<string, number>>({});

  const editable = CATALOGUE.filter(
    (entry) => entry.defaultTarget === null || entry.kind === 'supporting',
  );

  const targetFor = (entry: CatalogueEntry) => targets[entry.key] ?? entry.defaultTarget ?? 1;

  return (
    <Screen>
      <Text variant="body" tone="muted">
        {t('quests.supportingCap')}
      </Text>

      {editable.map((entry) => {
        const enabled = isDefaultTemplateEnabled(state, entry.key);
        const needsTarget =
          entry.key === 'keep_moving' ||
          entry.key === 'build_your_engine' ||
          entry.key === 'a_year_of_movement';
        return (
          <Card key={entry.key}>
            <CardHeader
              title={t(`quest.${entry.key}.title` as 'quest.show_up.title')}
              subtitle={t(`quest.${entry.key}.objective` as 'quest.show_up.objective')}
              trailing={
                <Text variant="caption" tone="muted" tabular>
                  {t('unit.xp', { count: rewardForQuest(entry.periodKind, entry.kind) })}
                </Text>
              }
            />
            <ToggleRow
              title={t('quests.activeSwitches')}
              subtitle={t(`period.${entry.periodKind}.one` as 'period.daily.one')}
              value={enabled}
              onChange={(next) => store.enableCatalogue(entry.key, next, targetFor(entry), now)}
            />
            {needsTarget ? (
              <View style={{ gap: 6 }}>
                <Text variant="label">{t('quests.chooseTarget')}</Text>
                <Stepper
                  label={t('quests.chooseTarget')}
                  value={targetFor(entry)}
                  step={entry.measure === 'steps' ? 1_000 : 10}
                  min={entry.measure === 'steps' ? 1_000 : 1}
                  max={entry.measure === 'steps' ? 30_000 : 500}
                  onChange={(value) => {
                    setTargets((current) => ({ ...current, [entry.key]: value }));
                    if (enabled) store.enableCatalogue(entry.key, true, value, now);
                  }}
                />
                <Text variant="caption" tone="muted">
                  {t('quests.chooseMeasure')}
                </Text>
              </View>
            ) : null}
          </Card>
        );
      })}

      <Button label={t('common.done')} onPress={() => router.back()} />
    </Screen>
  );
}

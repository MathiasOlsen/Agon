import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { CATALOGUE, type CatalogueEntry } from '@/core/catalogue';
import { isDefaultTemplateEnabled } from '@/core/engine';
import { rewardForQuest } from '@/core/rewards';
import type { Measurement } from '@/core/types';
import { useApp } from '@/state/app-provider';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { SegmentedControl, Stepper, ToggleRow } from '@/ui/controls';
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
  const [measures, setMeasures] = useState<Record<string, Measurement>>({});

  const editable = CATALOGUE.filter(
    (entry) => entry.defaultTarget === null || entry.kind === 'supporting',
  );

  const targetFor = (entry: CatalogueEntry) => targets[entry.key] ?? entry.defaultTarget ?? 1;

  const measureFor = (entry: CatalogueEntry) => measures[entry.key] ?? entry.measure;

  /** Goals that offer a choice of unit, with a sensible target for each. */
  const measureChoicesFor = (
    entry: CatalogueEntry,
  ): Array<{ measure: Measurement; target: number; label: string }> => {
    if (entry.key !== 'keep_moving') return [];
    return [
      { measure: 'steps', target: 6_000, label: t('quests.bySteps') },
      { measure: 'minutes', target: 60, label: t('quests.byMinutes') },
    ];
  };

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
        const choices = measureChoicesFor(entry);
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
              title={t(`quest.${entry.key}.title` as 'quest.show_up.title')}
              subtitle={`${t(`period.${entry.periodKind}.one` as 'period.daily.one')} · ${t('quests.activeSwitches')}`}
              value={enabled}
              onChange={(next) => store.enableCatalogue(entry.key, next, targetFor(entry), now)}
            />
            {needsTarget ? (
              <View style={{ gap: 6 }}>
                {choices.length > 0 ? (
                  <>
                    <Text variant="label">{t('quests.chooseMeasure')}</Text>
                    <SegmentedControl
                      label={t('quests.chooseMeasure')}
                      value={measureFor(entry)}
                      onChange={(measure) => {
                        const chosen = choices.find((choice) => choice.measure === measure);
                        setMeasures((current) => ({ ...current, [entry.key]: measure }));
                        if (chosen) {
                          setTargets((current) => ({ ...current, [entry.key]: chosen.target }));
                          if (enabled) {
                            store.enableCatalogue(
                              entry.key,
                              true,
                              chosen.target,
                              now,
                              chosen.measure,
                            );
                          }
                        }
                      }}
                      options={choices.map((choice) => ({
                        value: choice.measure,
                        label: choice.label,
                      }))}
                    />
                  </>
                ) : null}
                <Text variant="label">{t('quests.chooseTarget')}</Text>
                <Stepper
                  label={t('quests.chooseTarget')}
                  value={targetFor(entry)}
                  step={measureFor(entry) === 'steps' ? 1_000 : 10}
                  min={measureFor(entry) === 'steps' ? 1_000 : 1}
                  max={measureFor(entry) === 'steps' ? 30_000 : 500}
                  onChange={(value) => {
                    setTargets((current) => ({ ...current, [entry.key]: value }));
                    if (enabled) {
                      store.enableCatalogue(entry.key, true, value, now, measureFor(entry));
                    }
                  }}
                />
              </View>
            ) : null}
          </Card>
        );
      })}

      <Button label={t('common.done')} onPress={() => router.back()} />
    </Screen>
  );
}

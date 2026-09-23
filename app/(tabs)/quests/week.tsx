import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { addDays } from '@/core/dates';
import { planDraftFromSlots, planSlotsFromDraft, plannedMainCountBetween } from '@/core/plan';
import { useApp } from '@/state/app-provider';
import { useWeeklySummary } from '@/state/hooks';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { PlanPicker } from '@/ui/plan-picker';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

/**
 * Planning the week. A change applies to future quests: an instance that already
 * exists keeps the target it was created with, and anything recorded stays.
 */

export default function PlanWeek() {
  const { store, state, t } = useApp();
  const router = useRouter();
  const now = new Date().toISOString();
  const [draft, setDraft] = useState(() => planDraftFromSlots(state.planSlots));
  const week = useWeeklySummary(now);

  const previewSlots = planSlotsFromDraft(draft, (seed) => `preview-${seed}`);
  const weeklyTarget = plannedMainCountBetween(
    previewSlots,
    week.weekStart,
    addDays(week.weekStart, 6),
  );
  const trainingDays = draft.strengthDays.length + draft.cardioDays.length;

  return (
    <Screen>
      <Text variant="body" tone="muted">
        {t('onboarding.plan.body')}
      </Text>

      <PlanPicker draft={draft} onChange={setDraft} />

      <Card>
        <CardHeader title={t('quests.nextWeek')} subtitle={t('plan.choose')} />
        <Text variant="label" tabular>
          {t('plan.sessionsThisWeek', { count: weeklyTarget })}
        </Text>
        <Text variant="caption" tone="muted">
          {t('quests.recoveryCounts')}
        </Text>
      </Card>

      <Button
        label={t('common.save')}
        disabled={trainingDays === 0}
        onPress={() => {
          store.setPlan(draft, now);
          router.back();
        }}
      />
      {trainingDays === 0 ? (
        <Text variant="caption" tone="danger">
          {t('onboarding.plan.needOne')}
        </Text>
      ) : null}
    </Screen>
  );
}

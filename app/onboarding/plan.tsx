import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { planDraftFromSlots } from '@/core/plan';
import { OnboardingShell } from '@/ui/onboarding-shell';
import { PlanPicker } from '@/ui/plan-picker';
import { Text } from '@/ui/text';
import { useApp } from '@/state/app-provider';

export default function PlanStep() {
  const { store, state, t } = useApp();
  const router = useRouter();
  const [draft, setDraft] = useState(() => planDraftFromSlots(state.planSlots));

  const trainingDays =
    draft.strengthDays.length + draft.cardioDays.length + draft.mobilityDays.length;
  const canContinue = trainingDays > 0;

  return (
    <OnboardingShell
      step={4}
      title={t('onboarding.plan.title')}
      body={t('onboarding.plan.body')}
      onBack={() => router.back()}
      nextDisabled={!canContinue}
      onNext={() => {
        store.setPlan(draft, new Date().toISOString());
        router.push('/onboarding/reminders');
      }}
    >
      <View style={{ gap: 12 }}>
        <PlanPicker draft={draft} onChange={setDraft} />
        {canContinue ? (
          <Text variant="caption" tone="muted">
            {t('plan.sessionsThisWeek', { count: draft.strengthDays.length + draft.cardioDays.length })}
          </Text>
        ) : (
          <Text variant="caption" tone="danger">
            {t('onboarding.plan.needOne')}
          </Text>
        )}
      </View>
    </OnboardingShell>
  );
}

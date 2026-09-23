import type { ReactNode } from 'react';
import { View } from 'react-native';

import { CompanionSprite } from './pixel-sprite';
import { Button } from './button';
import { Screen } from './screen';
import { Text } from './text';
import { useApp } from '@/state/app-provider';

export const ONBOARDING_STEPS = 5;

/**
 * A shared frame for the onboarding steps: the same avatar preview, the same
 * step counter, and one clear action at the bottom.
 */

export function OnboardingShell({
  step,
  title,
  body,
  children,
  onNext,
  onBack,
  nextLabel,
  nextDisabled = false,
  showAvatar = true,
}: {
  step: number;
  title: string;
  body: string;
  children?: ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showAvatar?: boolean;
}) {
  const { state, theme, t } = useApp();

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="pixel" tone="muted">
          {t('app.name')}
        </Text>
        <Text variant="caption" tone="muted" tabular>
          {t('onboarding.step', { step, total: ONBOARDING_STEPS })}
        </Text>
      </View>

      {showAvatar ? (
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <CompanionSprite
            level={1}
            mood="ready"
            appearance={state.preferences.appearance}
            theme={theme}
            scale={5}
            label={t('a11y.avatar', { level: 1, mood: t('mood.ready') })}
          />
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text variant="display">{title}</Text>
        <Text variant="body" tone="muted">
          {body}
        </Text>
      </View>

      {children}

      <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
        {onBack ? (
          <Button label={t('onboarding.back')} variant="secondary" onPress={onBack} style={{ flex: 1 }} />
        ) : null}
        <Button
          label={nextLabel ?? t('onboarding.next')}
          onPress={onNext}
          disabled={nextDisabled}
          style={{ flex: 2 }}
        />
      </View>
    </Screen>
  );
}

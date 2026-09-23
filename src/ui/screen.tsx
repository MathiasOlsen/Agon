import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';

import { SCREEN_PADDING, SPACE } from '@/theme/tokens';

import { useThemeTokens } from '@/state/app-provider';

import { Text } from './text';

/**
 * A screen body. The scroll view is the first opaque child so the native tab
 * bar and headers stay transparent and safe areas behave on both platforms.
 */

export function Screen({
  children,
  style,
  contentStyle,
}: {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}) {
  const theme = useThemeTokens();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={[{ backgroundColor: theme.tokens.background, flex: 1 }, style]}
      contentContainerStyle={[
        { padding: SCREEN_PADDING, paddingBottom: SPACE.xxl * 2, gap: SPACE.lg },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function Headline({ children, subtitle }: { children: string; subtitle?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="display">{children}</Text>
      {subtitle ? (
        <Text variant="body" tone="muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionRule({
  icon,
}: {
  icon?: ReactNode;
}) {
  const theme = useThemeTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon}
      <View style={{ flex: 1, height: 1, backgroundColor: theme.tokens.progressTrack }} />
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <View style={{ gap: 8, alignItems: 'flex-start' }}>
      <Text variant="section">{title}</Text>
      <Text variant="body" tone="muted">
        {body}
      </Text>
      {action}
    </View>
  );
}

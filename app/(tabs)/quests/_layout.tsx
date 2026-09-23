import { Stack } from 'expo-router/stack';

import { useApp } from '@/state/app-provider';

export default function QuestsStack() {
  const { theme, t } = useApp();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.tokens.background },
        headerTintColor: theme.tokens.text,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.tokens.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('quests.board') }} />
      <Stack.Screen name="[id]" options={{ title: t('quests.board') }} />
      <Stack.Screen name="add" options={{ title: t('quests.addQuest'), presentation: 'modal' }} />
      <Stack.Screen name="week" options={{ title: t('plan.week') }} />
    </Stack>
  );
}

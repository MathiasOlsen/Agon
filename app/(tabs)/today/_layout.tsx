import { Stack } from 'expo-router/stack';

import { useApp } from '@/state/app-provider';

export default function TodayStack() {
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
      <Stack.Screen name="index" options={{ title: t('nav.today') }} />
      <Stack.Screen name="history" options={{ title: t('history.title') }} />
    </Stack>
  );
}

import { Stack } from 'expo-router/stack';

import { useApp } from '@/state/app-provider';

export default function ProfileStack() {
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
      <Stack.Screen name="index" options={{ title: t('profile.title') }} />
      <Stack.Screen name="preferences" options={{ title: t('prefs.title') }} />
      <Stack.Screen name="reminders" options={{ title: t('reminders.title') }} />
      <Stack.Screen name="data" options={{ title: t('data.title') }} />
      <Stack.Screen name="privacy" options={{ title: t('privacy.title') }} />
    </Stack>
  );
}

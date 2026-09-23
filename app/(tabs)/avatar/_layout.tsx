import { Stack } from 'expo-router/stack';

import { useApp } from '@/state/app-provider';

export default function AvatarStack() {
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
      <Stack.Screen name="index" options={{ title: t('nav.avatar') }} />
      <Stack.Screen name="customize" options={{ title: t('avatar.customize') }} />
    </Stack>
  );
}

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { AppProvider, useApp } from '@/state/app-provider';
import { getStore } from '@/state/instance';
import { configureNotificationHandler } from '@/services/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash screen is a courtesy; failing to hold it must not stop the app.
});

configureNotificationHandler();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider store={getStore()}>
        <RootStack />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { store, state, theme, t } = useApp();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    // Coming back after a while can mean a new day, a new period or a missed
    // session. Catch up on resume rather than showing a stale screen.
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') store.refresh();
    });
    store.refresh();
    return () => subscription.remove();
  }, [store]);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerTintColor: theme.tokens.text,
          headerStyle: { backgroundColor: theme.tokens.background },
          headerTitleStyle: { color: theme.tokens.text },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.tokens.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="session/[id]"
          options={{
            headerShown: true,
            title: t('session.title'),
            presentation: state.preferences.reduceMotion ? 'card' : 'fullScreenModal',
          }}
        />
      </Stack>
    </>
  );
}

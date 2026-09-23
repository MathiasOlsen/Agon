import { Redirect } from 'expo-router';

import { useApp } from '@/state/app-provider';

/** Nothing to show here: onboarding or the app, decided once. */
export default function Index() {
  const { state } = useApp();
  return <Redirect href={state.preferences.onboarded ? '/(tabs)/today' : '/onboarding'} />;
}

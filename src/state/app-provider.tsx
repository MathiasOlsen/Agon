import { createContext, use, useMemo, useSyncExternalStore, type ReactNode } from 'react';

import { createTranslator, type Locale, type Translator } from '@/i18n';
import { themeFor, type Theme } from '@/theme/tokens';
import type { AgonState } from '@/core/types';

import { AgonStore } from './store';

/**
 * One provider for the whole app: the store, the translator and the active
 * theme. Screens read them through hooks, so nothing has to be threaded down.
 */

export type AppContextValue = {
  store: AgonStore;
  state: AgonState;
  t: Translator;
  locale: Locale;
  theme: Theme;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  store,
  children,
}: {
  store: AgonStore;
  children: ReactNode;
}) {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const locale = state.preferences.locale;
  const t = useMemo(() => createTranslator(locale), [locale]);
  const theme = useMemo(() => themeFor(state.preferences.theme), [state.preferences.theme]);

  const value = useMemo<AppContextValue>(
    () => ({ store, state, t, locale, theme }),
    [store, state, t, locale, theme],
  );

  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp(): AppContextValue {
  const value = use(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider.');
  return value;
}

/** Convenience hook for the many screens that only need strings. */
export function useTranslation(): Translator {
  return useApp().t;
}

export function useThemeTokens(): Theme {
  return useApp().theme;
}

import type { ThemeId } from '@/core/types';

/**
 * Exact theme tokens from the handoff. Accent colours are decorative unless a
 * pairing is stated, and no theme implies anything about the person using it.
 */

export type ThemeTokens = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  successSurface: string;
  successText: string;
  border: string;
  progressTrack: string;
  danger: string;
  focus: string;
};

/** How cards and quest rows are drawn, per theme. */
export type QuestTreatment = 'outline' | 'rail' | 'stepped' | 'ticket';

export type Theme = {
  id: ThemeId;
  nameKey: string;
  isDark: boolean;
  treatment: QuestTreatment;
  /** Corner radius used by cards in this theme. */
  cardRadius: number;
  tokens: ThemeTokens;
};

export const THEMES: Record<ThemeId, Theme> = {
  moss: {
    id: 'moss',
    nameKey: 'theme.moss',
    isDark: false,
    treatment: 'outline',
    cardRadius: 6,
    tokens: {
      background: '#F5F1E7',
      surface: '#FFFCF5',
      text: '#252B27',
      textMuted: '#566052',
      primary: '#546D50',
      onPrimary: '#FFFFFF',
      accent: '#D9B65B',
      onAccent: '#252B27',
      successSurface: '#E3EBDD',
      successText: '#334E32',
      border: '#778270',
      progressTrack: '#DBDDD2',
      danger: '#A33232',
      focus: '#252B27',
    },
  },
  teal: {
    id: 'teal',
    nameKey: 'theme.teal',
    isDark: false,
    treatment: 'rail',
    cardRadius: 16,
    tokens: {
      background: '#F7F7F2',
      surface: '#FFFFFF',
      text: '#202B2B',
      textMuted: '#526361',
      primary: '#185B59',
      onPrimary: '#FFFFFF',
      accent: '#F1AC80',
      onAccent: '#202B2B',
      successSurface: '#E1F0E9',
      successText: '#185B59',
      border: '#718984',
      progressTrack: '#DCE5E1',
      danger: '#A33232',
      focus: '#202B2B',
    },
  },
  ink: {
    id: 'ink',
    nameKey: 'theme.ink',
    isDark: true,
    treatment: 'stepped',
    cardRadius: 2,
    tokens: {
      background: '#20232D',
      surface: '#303541',
      text: '#F5F2EA',
      textMuted: '#C0C5D0',
      primary: '#C7BBEE',
      onPrimary: '#20232D',
      accent: '#A9DCC8',
      onAccent: '#20232D',
      successSurface: '#283F3B',
      successText: '#A9DCC8',
      border: '#939CAF',
      progressTrack: '#4B5363',
      danger: '#FFB4AB',
      focus: '#F5F2EA',
    },
  },
  clay: {
    id: 'clay',
    nameKey: 'theme.clay',
    isDark: false,
    treatment: 'ticket',
    cardRadius: 8,
    tokens: {
      background: '#F7F2EC',
      surface: '#FFFCF8',
      text: '#292B30',
      textMuted: '#62616A',
      primary: '#AC503C',
      onPrimary: '#FFFFFF',
      accent: '#B7D3E5',
      onAccent: '#292B30',
      successSurface: '#E5EFF6',
      successText: '#234D63',
      border: '#8C7D76',
      progressTrack: '#E7DDD6',
      danger: '#A33232',
      focus: '#292B30',
    },
  },
};

export const DEFAULT_THEME: ThemeId = 'teal';

export function themeFor(id: ThemeId): Theme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME];
}

/** A four-point spacing scale: 4, 8, 12, 16, 24, 32. */
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const SCREEN_PADDING = 20;
export const CARD_PADDING = 16;
export const MIN_TOUCH_TARGET = 48;

/** Type scale from the handoff, with pixel labels reserved for short displays. */
export const TYPE = {
  display: 34,
  title: 26,
  section: 20,
  body: 16,
  label: 14,
  caption: 12,
} as const;

/** Used by every interactive element, so nothing falls below the target size. */
export const TOUCH = {
  minHeight: MIN_TOUCH_TARGET,
  minWidth: MIN_TOUCH_TARGET,
} as const;

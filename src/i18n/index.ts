import { da } from './da';
import { en, type TranslationKey } from './en';

/**
 * Translation lookup with a guaranteed fallback.
 *
 * A missing key falls back to English and then to the key itself, so a gap in a
 * translation can never blank out the interface. Keys are typed, which means
 * the compiler catches most omissions before a test ever runs.
 */

export const LOCALES = ['en', 'da'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  da: 'Dansk',
};

export type { TranslationKey };

/**
 * Quantities are plural families: `unit.sessions` resolves to `.one` or
 * `.other` depending on the count, so a caller never has to choose the form.
 */
export type PluralKey =
  | 'unit.sessions'
  | 'unit.minutes'
  | 'unit.steps'
  | 'unit.kilometres'
  | 'unit.miles';

export type MessageKey = TranslationKey | PluralKey;

const BUNDLES: Record<Locale, Record<TranslationKey, string>> = { en, da };

export type TranslationVars = Record<string, string | number>;

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Picks the best supported locale from a device language tag. */
export function resolveLocale(tags: readonly string[] | string | null | undefined): Locale {
  const list = Array.isArray(tags) ? tags : [tags ?? ''];
  for (const tag of list) {
    const base = String(tag).toLowerCase().split('-')[0] ?? '';
    if (isLocale(base)) return base;
  }
  return 'en';
}

export function pluralCategory(locale: Locale, count: number): 'one' | 'other' {
  void locale;
  return Math.abs(count) === 1 ? 'one' : 'other';
}

export function interpolate(template: string, vars: TranslationVars | undefined): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: TranslationVars,
): string {
  const bundle = BUNDLES[locale] ?? en;
  const base: string = key;
  let resolvedKey: string = base;
  if (typeof vars?.count === 'number') {
    const candidate = `${base}.${pluralCategory(locale, vars.count)}`;
    if (candidate in en || candidate in bundle) resolvedKey = candidate;
  }
  const template =
    (bundle as Record<string, string>)[resolvedKey] ??
    (en as Record<string, string>)[resolvedKey] ??
    resolvedKey;
  return interpolate(template, vars);
}

export type Translator = (key: MessageKey, vars?: TranslationVars) => string;

export function createTranslator(locale: Locale): Translator {
  return (key, vars) => translate(locale, key, vars);
}

export function bundleFor(locale: Locale): Record<TranslationKey, string> {
  return BUNDLES[locale];
}

/** Used by the test suite to prove both languages cover the same keys. */
export function missingKeys(locale: Locale): string[] {
  const reference = Object.keys(en);
  const bundle = BUNDLES[locale] as Record<string, string | undefined>;
  return reference.filter((key) => !bundle[key]);
}

export function unexpectedKeys(locale: Locale): string[] {
  const reference = new Set(Object.keys(en));
  return Object.keys(BUNDLES[locale]).filter((key) => !reference.has(key));
}

export function placeholdersIn(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '');
}

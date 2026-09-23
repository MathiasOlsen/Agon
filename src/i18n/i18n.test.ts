import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOCALES, bundleFor, createTranslator, interpolate, missingKeys, placeholdersIn, resolveLocale, translate, unexpectedKeys } from './index';

test('no shipped language is missing a string', () => {
  for (const locale of LOCALES) {
    assert.deepEqual(missingKeys(locale), [], `${locale} is missing keys`);
    assert.deepEqual(unexpectedKeys(locale), [], `${locale} has keys English does not`);
  }
});

test('translations keep the same placeholders as English', () => {
  const english = bundleFor('en');
  for (const locale of LOCALES) {
    const bundle = bundleFor(locale);
    for (const [key, template] of Object.entries(english)) {
      const translated = (bundle as Record<string, string>)[key];
      if (!translated) continue;
      assert.deepEqual(
        placeholdersIn(translated).sort(),
        placeholdersIn(template).sort(),
        `${locale}:${key}`,
      );
    }
  }
});

test('Danish covers the launch-critical wording', () => {
  const danish = bundleFor('da');
  assert.match(danish['data.passphraseHint'], /Agon kan ikke gendanne/);
  assert.match(danish['privacy.localOnly'], /på denne enhed/);
  assert.notEqual(danish['nav.today'], bundleFor('en')['nav.today']);
});

test('counts pick the right plural form in both languages', () => {
  assert.equal(translate('en', 'unit.sessions', { count: 1 }), '1 session');
  assert.equal(translate('en', 'unit.sessions', { count: 0 }), '0 sessions');
  assert.equal(translate('en', 'unit.sessions', { count: 3 }), '3 sessions');
  assert.equal(translate('da', 'unit.sessions', { count: 1 }), '1 session');
  assert.equal(translate('da', 'unit.sessions', { count: 4 }), '4 sessioner');
  assert.equal(translate('da', 'unit.minutes', { count: 2 }), '2 minutter');
});

test('unknown placeholders are left alone rather than blanked', () => {
  assert.equal(interpolate('{a} and {b}', { a: 'one' }), 'one and {b}');
});

test('the device language picks the closest supported locale', () => {
  assert.equal(resolveLocale(['da-DK', 'en-US']), 'da');
  assert.equal(resolveLocale(['en-GB']), 'en');
  assert.equal(resolveLocale(['de-DE']), 'en', 'an unsupported language falls back to English');
  assert.equal(resolveLocale([]), 'en');
  assert.equal(resolveLocale(null), 'en');
});

test('a translator is stable and typed', () => {
  const t = createTranslator('da');
  assert.equal(t('nav.quests'), 'Quest');
  assert.equal(t('level.label', { level: 8 }), 'Niveau 8');
});

test('every level and mood label exists in both languages', () => {
  const keys = [
    'level.label',
    'level.maxReached',
    'mood.sleepy',
    'mood.radiant',
    'tier.ascendant',
    'period.daily',
    'period.yearly',
  ] as const;
  for (const locale of LOCALES) {
    for (const key of keys) {
      assert.ok(translate(locale, key).length > 0, `${locale}:${key}`);
    }
  }
});

import { describe, expect, it } from 'vitest';
import { getLocaleDirection, localizePath, locales } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';

function keysOf(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];

  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child) ? keysOf(child, path) : [path];
  });
}

describe('internationalization foundation', () => {
  it('keeps identical translation key coverage across all locales', () => {
    const englishKeys = keysOf(getDictionary('en')).sort();
    for (const locale of locales) expect(keysOf(getDictionary(locale)).sort()).toEqual(englishKeys);
  });

  it('uses RTL only for Arabic', () => {
    expect(getLocaleDirection('ar')).toBe('rtl');
    expect(getLocaleDirection('en')).toBe('ltr');
    expect(getLocaleDirection('fr')).toBe('ltr');
  });

  it('replaces or adds locale prefixes without losing the route', () => {
    expect(localizePath('/en/patient', 'ar')).toBe('/ar/patient');
    expect(localizePath('/login', 'fr')).toBe('/fr/login');
  });
});

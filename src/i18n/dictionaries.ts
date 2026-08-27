import type { Locale } from './config';
import { ar } from './messages/ar';
import { en, type Dictionary } from './messages/en';
import { fr } from './messages/fr';

const dictionaries: Record<Locale, Dictionary> = { en, fr, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

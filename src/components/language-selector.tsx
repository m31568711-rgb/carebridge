'use client';

import { Languages } from 'lucide-react';
import { usePathname, useRouter } from '@/src/react-app/compat/navigation';
import type { Locale } from '@/src/i18n/config';
import { locales, localizePath } from '@/src/i18n/config';
import type { Dictionary } from '@/src/i18n/messages/en';

interface LanguageSelectorProps {
  locale: Locale;
  labels: Dictionary['language'];
  compact?: boolean;
}

export function LanguageSelector({ locale, labels, compact = false }: LanguageSelectorProps) {
  const pathname = usePathname();
  const router = useRouter();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `carebridge-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.replace(localizePath(pathname, nextLocale));
  }

  return (
    <label className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
      <Languages aria-hidden="true" className="size-4 shrink-0 text-blue-600" />
      {compact ? <span className="sr-only">{labels.label}</span> : null}
      <select
        aria-label={labels.label}
        className="min-h-10 appearance-none bg-transparent pe-5 font-medium outline-none"
        onChange={(event) => changeLocale(event.target.value as Locale)}
        value={locale}
      >
        {locales.map((item) => <option key={item} value={item}>{labels[item]}</option>)}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute end-3 text-[9px]">▼</span>
    </label>
  );
}

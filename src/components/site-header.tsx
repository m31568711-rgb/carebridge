import Link from 'next/link';
import type { Locale } from '@/src/i18n/config';
import type { Dictionary } from '@/src/i18n/messages/en';
import { Brand } from './brand';
import { LanguageSelector } from './language-selector';

interface SiteHeaderProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function SiteHeader({ locale, dictionary }: SiteHeaderProps) {
  const nav = [
    { href: '#find-care', label: dictionary.navigation.findCare },
    { href: '#journey', label: dictionary.navigation.journey },
    { href: '#specialties', label: dictionary.navigation.specialties },
    { href: '#trust', label: dictionary.navigation.trust },
  ];

  return (
    <header className="relative z-30 border-b border-blue-100/60 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Brand href={`/${locale}`} name={dictionary.common.brand} />
        <nav aria-label={dictionary.common.openMenu} className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
          {nav.map((item) => <a className="transition hover:text-blue-700" href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector compact locale={locale} labels={dictionary.language} />
          <Link className="hidden min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex" href={`/${locale}/login`}>
            {dictionary.common.signIn}
          </Link>
          <Link className="inline-flex min-h-10 items-center rounded-xl bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700" href={`/${locale}/signup`}>
            {dictionary.common.signUp}
          </Link>
        </div>
      </div>
    </header>
  );
}

'use client';

import Link from '@/src/react-app/compat/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { Locale } from '@/src/i18n/config';
import type { Dictionary } from '@/src/i18n/messages/en';
import { Brand } from './brand';
import { LanguageSelector } from './language-selector';

interface SiteHeaderProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function SiteHeader({ locale, dictionary }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const nav = [
    { href: '#find-care', label: dictionary.navigation.findCare },
    { href: '#journey', label: dictionary.navigation.journey },
    { href: '#specialties', label: dictionary.navigation.specialties },
    { href: '#trust', label: dictionary.navigation.trust },
  ];

  return (
    <header className="relative z-30 border-b border-[var(--border)] bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Brand href={`/${locale}`} name={dictionary.common.brand} />
        <nav aria-label={dictionary.common.openMenu} className="hidden items-center gap-6 text-[0.82rem] font-medium text-[#53697b] lg:flex">
          {nav.map((item, index) => <a className={`rounded-lg px-2 py-1.5 transition hover:bg-[#f2f7fb] hover:text-[var(--primary)] ${index === 0 ? 'text-[var(--primary)]' : ''}`} href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector compact locale={locale} labels={dictionary.language} />
          <Link className="hidden min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-[#40576a] transition hover:bg-[#edf3f7] sm:inline-flex" href={`/${locale}/login`}>
            {dictionary.common.signIn}
          </Link>
          <button aria-expanded={open} aria-label={open ? dictionary.common.close : dictionary.common.openMenu} className="grid size-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--foreground)] lg:hidden" onClick={() => setOpen((value) => !value)} type="button">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
      </div>
      {open ? <div className="border-t border-[var(--border)] bg-white px-5 py-4 shadow-lg lg:hidden"><nav className="grid gap-1">{nav.map((item) => <a className="rounded-xl px-3 py-3 text-sm font-medium text-[#40576a] hover:bg-[#f2f7fb]" href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}</nav><div className="mt-3 border-t border-[var(--border)] pt-4"><Link className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white" href={`/${locale}/login`}>{dictionary.common.signIn}</Link></div></div> : null}
    </header>
  );
}

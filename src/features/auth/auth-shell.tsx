import Link from 'next/link';
import type { ReactNode } from 'react';
import { HeartPulse, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/src/i18n/config';
import type { Dictionary } from '@/src/i18n/messages/en';
import { Brand } from '@/src/components/brand';
import { LanguageSelector } from '@/src/components/language-selector';

interface AuthShellProps {
  locale: Locale;
  dictionary: Dictionary;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ locale, dictionary, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[.9fr_1.1fr]" id="main-content">
      <section className="relative hidden overflow-hidden bg-blue-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute -end-32 -top-32 size-96 rounded-full border-[70px] border-blue-500/25" />
        <div aria-hidden="true" className="absolute -bottom-40 start-16 size-96 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="relative"><Brand href={`/${locale}`} inverse name={dictionary.common.brand} /></div>
        <div className="relative max-w-xl">
          <span className="grid size-14 place-items-center rounded-2xl bg-white/10"><HeartPulse aria-hidden="true" className="size-7" /></span>
          <p className="mt-7 text-4xl font-semibold leading-tight tracking-[-0.04em]">{dictionary.common.brandTagline}</p>
          <div className="mt-8 flex flex-wrap gap-4 text-sm text-blue-100">
            <span className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-4" />{dictionary.landing.hero.privacy}</span>
            <span className="flex items-center gap-2"><LockKeyhole aria-hidden="true" className="size-4" />{dictionary.landing.trust.accessTitle}</span>
          </div>
        </div>
        <p className="relative text-xs text-blue-200">{dictionary.footer.description}</p>
      </section>

      <section className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="lg:hidden"><Brand href={`/${locale}`} name={dictionary.common.brand} /></div>
          <Link className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-700 lg:inline" href={`/${locale}`}>{dictionary.auth.shared.returnHome}</Link>
          <LanguageSelector locale={locale} labels={dictionary.language} />
        </header>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{dictionary.auth.shared.secureArea}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_25px_70px_-40px_rgba(15,23,42,.35)] sm:p-8">{children}</div>
            <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
          </div>
        </div>
      </section>
    </main>
  );
}

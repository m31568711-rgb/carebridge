import Link from 'next/link';
import type { Locale } from '@/src/i18n/config';
import type { Dictionary } from '@/src/i18n/messages/en';
import { Brand } from './brand';

interface SiteFooterProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function SiteFooter({ locale, dictionary }: SiteFooterProps) {
  return (
    <footer className="border-t border-[var(--border)] bg-[#f5f8fb] text-[#53697b]">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-12">
        <div className="max-w-md">
          <Brand href={`/${locale}`} inverse name={dictionary.common.brand} />
          <p className="mt-5 text-sm leading-7 text-[#667c8d]">{dictionary.footer.description}</p>
        </div>
        <div>
          <h2 className="font-semibold text-[var(--foreground)]">{dictionary.footer.platform}</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li><a className="transition hover:text-[var(--primary)]" href="#find-care">{dictionary.navigation.findCare}</a></li>
            <li><a className="transition hover:text-[var(--primary)]" href="#specialties">{dictionary.navigation.specialties}</a></li>
            <li><a className="transition hover:text-[var(--primary)]" href="#trust">{dictionary.navigation.trust}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-[var(--foreground)]">{dictionary.footer.support}</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link className="transition hover:text-[var(--primary)]" href={`/${locale}`}>{dictionary.footer.privacy}</Link></li>
            <li><Link className="transition hover:text-[var(--primary)]" href={`/${locale}`}>{dictionary.footer.terms}</Link></li>
            <li><Link className="transition hover:text-[var(--primary)]" href={`/${locale}`}>{dictionary.footer.accessibility}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] bg-white/55">
        <p className="mx-auto max-w-7xl px-5 py-6 text-xs text-[#708496] sm:px-8 lg:px-12">© {new Date().getFullYear()} {dictionary.footer.rights}</p>
      </div>
    </footer>
  );
}

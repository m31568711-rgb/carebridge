import { notFound } from 'next/navigation';
import { getLocaleDirection, isLocale, locales } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);

  return (
    <div dir={getLocaleDirection(locale)} lang={locale}>
      <a className="skip-link" href="#main-content">{dictionary.common.skipToContent}</a>
      {children}
    </div>
  );
}

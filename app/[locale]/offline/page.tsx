import Link from '@/src/react-app/compat/link';
import { CloudOff } from 'lucide-react';
import { notFound } from '@/src/react-app/compat/navigation';
import { Brand } from '@/src/components/brand';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';

export default async function OfflinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5" id="main-content">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-12">
        <div className="flex justify-center"><Brand href={`/${locale}`} name={dictionary.common.brand} /></div>
        <span className="mx-auto mt-10 grid size-16 place-items-center rounded-3xl bg-blue-50 text-blue-700"><CloudOff aria-hidden="true" className="size-8" /></span>
        <h1 className="mt-7 text-3xl font-semibold tracking-tight text-slate-950">{dictionary.install.offlineTitle}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{dictionary.install.offlineDescription}</p>
        <Link className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white" href={`/${locale}`}>{dictionary.install.returnHome}</Link>
      </div>
    </main>
  );
}

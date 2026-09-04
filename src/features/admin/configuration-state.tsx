import Link from '@/src/react-app/compat/link';
import { DatabaseZap } from 'lucide-react';
import { Brand } from '@/src/components/brand';
import type { Locale } from '@/src/i18n/config';
import type { AdminDictionary } from './messages';

export function AdminConfigurationState({ copy, locale }: { copy: AdminDictionary; locale: Locale }) {
  return <main className="grid min-h-screen place-items-center bg-[#f5f8fb] p-5" id="main-content"><div className="w-full max-w-xl rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-7 text-center shadow-[var(--shadow-raised)] sm:p-10"><div className="flex justify-center"><Brand href={`/${locale}`} name="CareBridge" /></div><span className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-[#eaf3f9] text-[var(--primary)]"><DatabaseZap className="size-6" /></span><h1 className="type-h2 mt-6 text-[var(--foreground)]">{copy.common.configurationTitle}</h1><p className="mt-4 text-sm leading-7 text-[var(--muted)]">{copy.common.configurationDescription}</p><Link className="mt-7 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]" href={`/${locale}`}>{copy.common.backHome}</Link></div></main>;
}

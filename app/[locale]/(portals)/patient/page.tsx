import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FilePlus2, Search, Stethoscope } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/ui/empty-state';
import { PageHeader } from '@/src/components/ui/page-header';
import { getCaseDictionary } from '@/src/features/cases/messages';
import { loadPatientCases, localized } from '@/src/features/cases/data';
import { isLocale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const context = await requireRoles(locale, ['PATIENT']); const copy = getCaseDictionary(locale); const supabase = await getSupabaseServerClient(); const cases = supabase ? await loadPatientCases(supabase, context.userId) : [];
  return <div className="mx-auto max-w-7xl"><PageHeader description={copy.patient.description} eyebrow={copy.patient.eyebrow} title={copy.patient.title} /><div className="mt-6 flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white" href={`/${locale}/patient/cases/new`}><FilePlus2 className="size-4" />{copy.patient.create}</Link><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold" href={`/${locale}/patient/providers`}><Search className="size-4" />{copy.patient.browse}</Link></div><section className="mt-8"><h2 className="text-lg font-semibold">{copy.patient.recent}</h2>{cases.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cases.map((record) => <Link href={`/${locale}/patient/cases/${record.id}`} key={record.id}><Card className="h-full" variant="interactive"><CardContent><div className="flex items-center justify-between gap-3"><Badge variant="blue">{copy.statuses[record.status]}</Badge><Stethoscope className="size-5 text-slate-400" /></div><h3 className="mt-4 font-semibold">{record.title}</h3><p className="mt-2 text-sm text-slate-600">{localized(record.specialty?.name_i18n, locale)}</p><p className="mt-5 text-xs text-slate-500">{copy.case.updated}: {new Intl.DateTimeFormat(locale).format(new Date(record.updated_at))}</p></CardContent></Card></Link>)}</div> : <div className="mt-4"><EmptyState description={copy.patient.emptyDescription} title={copy.patient.empty} /></div>}</section></div>;
}

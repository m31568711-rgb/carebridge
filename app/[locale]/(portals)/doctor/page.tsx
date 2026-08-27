import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/ui/empty-state';
import { PageHeader } from '@/src/components/ui/page-header';
import { loadDoctorCases, localized } from '@/src/features/cases/data';
import { getCaseDictionary } from '@/src/features/cases/messages';
import { isLocale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); const context = await requireRoles(locale, ['DOCTOR']); const copy = getCaseDictionary(locale); const supabase = await getSupabaseServerClient(); const result = supabase ? await loadDoctorCases(supabase, context.userId) : { doctor: null, cases: [] }; return <div className="mx-auto max-w-7xl"><PageHeader description={copy.doctor.description} eyebrow={copy.doctor.eyebrow} title={copy.doctor.title} />{result.cases.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.cases.map((record) => <Link href={`/${locale}/doctor/cases/${record.id}`} key={record.id}><Card className="h-full" variant="interactive"><CardContent><Badge variant="blue">{copy.statuses[record.status]}</Badge><h2 className="mt-4 font-semibold">{record.title}</h2><p className="mt-2 text-sm text-slate-600">{localized(record.specialty?.name_i18n, locale)}</p><p className="mt-4 line-clamp-2 text-sm text-slate-500">{record.description}</p></CardContent></Card></Link>)}</div> : <div className="mt-8"><EmptyState description={copy.doctor.emptyDescription} title={copy.doctor.empty} /></div>}</div>; }

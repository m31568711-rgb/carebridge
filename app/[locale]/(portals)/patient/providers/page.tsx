import { notFound } from 'next/navigation';
import { PageHeader } from '@/src/components/ui/page-header';
import { loadCaseOptions, searchProviders } from '@/src/features/cases/data';
import { getCaseDictionary } from '@/src/features/cases/messages';
import { ProviderDiscovery } from '@/src/features/cases/provider-discovery';
import { isLocale } from '@/src/i18n/config';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';

export const dynamic = 'force-dynamic';
export default async function ProvidersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); const query = await searchParams; const one = (key: string) => typeof query[key] === 'string' ? query[key] as string : undefined; const number = (key: string) => { const value = Number(one(key)); return Number.isFinite(value) ? value : undefined; }; const supabase = await getSupabaseServerClient(); if (!supabase) notFound(); const copy = getCaseDictionary(locale); const [options, result] = await Promise.all([loadCaseOptions(supabase, locale), searchProviders(supabase, { query: one('q'), providerType: one('type'), countryId: one('country'), cityId: one('city'), specialtyId: one('specialty'), latitude: number('lat'), longitude: number('lng'), page: number('page') })]); return <div className="mx-auto max-w-7xl"><PageHeader description={copy.discovery.description} eyebrow={copy.discovery.eyebrow} title={copy.discovery.title} /><div className="mt-8"><ProviderDiscovery copy={copy} locale={locale} options={options} rows={result.rows} total={result.rows[0]?.total_count ?? 0} /></div></div>; }

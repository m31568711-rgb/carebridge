import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/src/components/ui/card';
import { PageHeader } from '@/src/components/ui/page-header';
import { CaseForm } from '@/src/features/cases/case-forms';
import { loadCaseOptions } from '@/src/features/cases/data';
import { getCaseDictionary } from '@/src/features/cases/messages';
import { isLocale } from '@/src/i18n/config';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';

export const dynamic = 'force-dynamic';
export default async function NewCasePage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); const supabase = await getSupabaseServerClient(); if (!supabase) notFound(); const copy = getCaseDictionary(locale); const options = await loadCaseOptions(supabase, locale); return <div className="mx-auto max-w-3xl"><PageHeader description={copy.case.newDescription} eyebrow={copy.patient.eyebrow} title={copy.case.newTitle} /><Card className="mt-8" variant="form"><CardContent><CaseForm copy={copy} locale={locale} options={options} /></CardContent></Card></div>; }

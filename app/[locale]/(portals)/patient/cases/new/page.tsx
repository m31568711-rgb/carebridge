import { notFound } from '@/src/react-app/compat/navigation';
import { Card, CardContent } from '@/src/components/ui/card';
import { PageHeader } from '@/src/components/ui/page-header';
import { CaseForm } from '@/src/features/cases/case-forms';
import { loadCaseOptions, loadPatientProfile } from '@/src/features/cases/data';
import { getCaseDictionary } from '@/src/features/cases/messages';
import { isLocale } from '@/src/i18n/config';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import { requireRoles } from '@/src/lib/auth/context';

export const dynamic = 'force-dynamic';
export default async function NewCasePage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); const context = await requireRoles(locale, ['PATIENT']); const supabase = await getSupabaseBrowserClient(); if (!supabase) notFound(); const copy = getCaseDictionary(locale); const [options, profile] = await Promise.all([loadCaseOptions(supabase, locale), loadPatientProfile(supabase, context.userId)]); return <div className="mx-auto max-w-3xl"><PageHeader description={copy.case.newDescription} eyebrow={copy.patient.eyebrow} title={copy.case.newTitle} /><Card className="mt-8" variant="form"><CardContent><CaseForm copy={copy} locale={locale} options={options} profile={profile} /></CardContent></Card></div>; }

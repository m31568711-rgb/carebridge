import { notFound } from '@/src/react-app/compat/navigation';
import { PageHeader } from '@/src/components/ui/page-header';
import { loadCareJourney,loadClinicalProviders } from '@/src/features/care-journeys/data';
import { CareJourneyWorkspace } from '@/src/features/care-journeys/journey-admin-ui';
import { getCareJourneyDictionary } from '@/src/features/care-journeys/messages';
import { isLocale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';

export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string;journeyId:string}>}){const{locale,journeyId}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['ADMIN','SUPER_ADMIN']);const s=await getSupabaseBrowserClient();if(!s)notFound();const[journey,providers]=await Promise.all([loadCareJourney(s,journeyId),loadClinicalProviders(s)]);if(!journey)notFound();const copy=getCareJourneyDictionary(locale);return <div className="mx-auto max-w-[92rem]"><PageHeader description={`${journey.patient?.display_name||[journey.patient?.first_name,journey.patient?.last_name].filter(Boolean).join(' ')} · ${journey.booking_reference}`} eyebrow={copy.eyebrow} title={copy.title}/><div className="mt-7"><CareJourneyWorkspace copy={copy} journey={journey} locale={locale} providers={providers}/></div></div>}

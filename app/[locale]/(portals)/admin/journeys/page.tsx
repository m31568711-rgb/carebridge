import { notFound } from '@/src/react-app/compat/navigation';
import { PageHeader } from '@/src/components/ui/page-header';
import { loadCareJourneys,loadPatients } from '@/src/features/care-journeys/data';
import { CareJourneyList } from '@/src/features/care-journeys/journey-admin-ui';
import { getCareJourneyDictionary } from '@/src/features/care-journeys/messages';
import { isLocale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';

export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['ADMIN','SUPER_ADMIN']);const s=await getSupabaseBrowserClient();if(!s)notFound();const[journeys,patients]=await Promise.all([loadCareJourneys(s),loadPatients(s)]);const copy=getCareJourneyDictionary(locale);return <div className="mx-auto max-w-7xl"><PageHeader description={copy.description} eyebrow={copy.eyebrow} title={copy.title}/><div className="mt-7"><CareJourneyList copy={copy} journeys={journeys} locale={locale} patients={patients}/></div></div>}

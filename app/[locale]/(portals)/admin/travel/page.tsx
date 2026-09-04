import { notFound } from '@/src/react-app/compat/navigation';
import { PageHeader } from '@/src/components/ui/page-header';
import { loadTravelData } from '@/src/features/travel/data';
import { getTravelDictionary } from '@/src/features/travel/messages';
import { TravelWorkspace } from '@/src/features/travel/travel-ui';
import { isLocale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';

export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['ADMIN','SUPER_ADMIN']);const s=await getSupabaseBrowserClient();if(!s)notFound();const data=await loadTravelData(s);const copy=getTravelDictionary(locale);return <div className="mx-auto max-w-[92rem]"><PageHeader description={copy.travelDescription} eyebrow={copy.accommodation} title={copy.travelPassport}/><div className="mt-7"><TravelWorkspace admin copy={copy} documents={data.documents} journeys={data.journeys} locale={locale} passports={data.passports} plans={data.plans}/></div></div>}

import { notFound } from '@/src/react-app/compat/navigation';
import { PageHeader } from '@/src/components/ui/page-header';
import { AccommodationManager } from '@/src/features/travel/accommodation-ui';
import { loadAccommodationData } from '@/src/features/travel/data';
import { getTravelDictionary } from '@/src/features/travel/messages';
import { isLocale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';

export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['ADMIN','SUPER_ADMIN']);const s=await getSupabaseBrowserClient();if(!s)notFound();const data=await loadAccommodationData(s,true);const copy=getTravelDictionary(locale);return <div className="mx-auto max-w-[92rem]"><PageHeader description={copy.accommodationDescription} eyebrow={copy.travelPassport} title={copy.accommodation}/><div className="mt-7"><AccommodationManager cities={data.cities} copy={copy} journeys={data.journeys} locale={locale} options={data.options} properties={data.properties} reservations={data.reservations}/></div></div>}

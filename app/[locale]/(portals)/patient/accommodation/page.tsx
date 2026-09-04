import { notFound } from '@/src/react-app/compat/navigation';
import { PageHeader } from '@/src/components/ui/page-header';
import { AccommodationPatient } from '@/src/features/travel/accommodation-ui';
import { loadAccommodationData } from '@/src/features/travel/data';
import { getTravelDictionary } from '@/src/features/travel/messages';
import { isLocale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';

export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['PATIENT']);const s=await getSupabaseBrowserClient();if(!s)notFound();const data=await loadAccommodationData(s);const copy=getTravelDictionary(locale);return <div className="mx-auto max-w-6xl"><PageHeader description={copy.browseDescription} eyebrow={copy.travelPassport} title={copy.accommodation}/><div className="mt-7"><AccommodationPatient copy={copy} journeys={data.journeys} locale={locale} options={data.options.filter(o=>o.is_active&&o.property?.is_active)} preferences={data.preferences} reservations={data.reservations}/></div></div>}

import { notFound } from 'next/navigation';
import { PageHeader } from '@/src/components/ui/page-header';
import { loadTravelData } from '@/src/features/travel/data';
import { getTravelDictionary } from '@/src/features/travel/messages';
import { TravelWorkspace } from '@/src/features/travel/travel-ui';
import { isLocale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';

export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['PATIENT']);const s=await getSupabaseServerClient();if(!s)notFound();const data=await loadTravelData(s);const copy=getTravelDictionary(locale);return <div className="mx-auto max-w-6xl"><PageHeader description={copy.travelDescription} eyebrow={copy.accommodation} title={copy.travelPassport}/><div className="mt-7"><TravelWorkspace admin={false} copy={copy} documents={data.documents} journeys={data.journeys} locale={locale} passports={data.passports} plans={data.plans}/></div></div>}

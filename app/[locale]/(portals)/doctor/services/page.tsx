import {notFound} from '@/src/react-app/compat/navigation';
import {loadAssignedJourneyServices} from '@/src/features/role-services/data';
import {RoleServicesPage} from '@/src/features/role-services/role-services-ui';
import {isLocale} from '@/src/i18n/config';
import {requireRoles} from '@/src/lib/auth/context';
import {getSupabaseBrowserClient} from '@/src/lib/supabase/browser';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['DOCTOR']);const s=await getSupabaseBrowserClient();if(!s)notFound();return <RoleServicesPage locale={locale} portal="doctor" rows={await loadAssignedJourneyServices(s)}/>}

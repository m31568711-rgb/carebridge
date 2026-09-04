import {notFound} from '@/src/react-app/compat/navigation';
import {PageHeader} from '@/src/components/ui/page-header';
import {CustomerAccountDetailView} from '@/src/features/customer-accounts/customer-accounts-ui';
import {loadCustomerAccount} from '@/src/features/customer-accounts/data';
import {getCustomerAccountsDictionary} from '@/src/features/customer-accounts/messages';
import {isLocale} from '@/src/i18n/config';
import {requireRoles} from '@/src/lib/auth/context';
import {getSupabaseBrowserClient} from '@/src/lib/supabase/browser';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string;patientId:string}>}){const{locale,patientId}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['ADMIN','SUPER_ADMIN']);const s=await getSupabaseBrowserClient();if(!s)notFound();const detail=await loadCustomerAccount(s,patientId);if(!detail)notFound();const copy=getCustomerAccountsDictionary(locale);return <div className="mx-auto max-w-[92rem]"><PageHeader description={detail.patientName} eyebrow={copy.eyebrow} title={copy.account}/><div className="mt-7"><CustomerAccountDetailView copy={copy} detail={detail} locale={locale}/></div></div>}

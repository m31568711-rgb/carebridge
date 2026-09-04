import {notFound} from '@/src/react-app/compat/navigation';
import {PageHeader} from '@/src/components/ui/page-header';
import {CustomerAccountsList} from '@/src/features/customer-accounts/customer-accounts-ui';
import {loadCustomerAccounts} from '@/src/features/customer-accounts/data';
import {getCustomerAccountsDictionary} from '@/src/features/customer-accounts/messages';
import {isLocale} from '@/src/i18n/config';
import {requireRoles} from '@/src/lib/auth/context';
import {getSupabaseBrowserClient} from '@/src/lib/supabase/browser';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['ADMIN','SUPER_ADMIN']);const s=await getSupabaseBrowserClient();if(!s)notFound();const[rows,copy]=await Promise.all([loadCustomerAccounts(s),Promise.resolve(getCustomerAccountsDictionary(locale))]);return <div className="mx-auto max-w-[92rem]"><PageHeader description={copy.description} eyebrow={copy.eyebrow} title={copy.title}/><div className="mt-7"><CustomerAccountsList copy={copy} locale={locale} rows={rows}/></div></div>}

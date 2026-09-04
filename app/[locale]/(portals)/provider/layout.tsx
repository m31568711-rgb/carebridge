import { notFound } from '@/src/react-app/compat/navigation';
import { DashboardShell } from '@/src/features/dashboard/dashboard-shell';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';
import { requireRoles } from '@/src/lib/auth/context';
export const dynamic='force-dynamic';
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();const dictionary=getDictionary(locale);const context=await requireRoles(locale,['PROVIDER','HOSPITAL_ADMIN','HOSPITAL_COORDINATOR','PHARMACY']);return <DashboardShell context={context} dictionary={dictionary} locale={locale} portal="provider">{children}</DashboardShell>}

import {notFound} from '@/src/react-app/compat/navigation';
import {BulkImportPage} from '@/src/features/admin/bulk-import-page';
import {isLocale} from '@/src/i18n/config';
import {requireRoles} from '@/src/lib/auth/context';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();await requireRoles(locale,['ADMIN','SUPER_ADMIN']);return <BulkImportPage locale={locale}/>}

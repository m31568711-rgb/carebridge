import { notFound } from '@/src/react-app/compat/navigation';
import { AdminDashboard } from '@/src/features/admin/admin-dashboard';
import { loadAdminDashboard } from '@/src/features/admin/data';
import { getAdminDictionary } from '@/src/features/admin/messages';
import { isLocale } from '@/src/i18n/config';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';

export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const supabase = await getSupabaseBrowserClient();
  const data = supabase ? await loadAdminDashboard(supabase) : { counts:{ hospitals:0,doctors:0,pharmacies:0,radiologyCenters:0,medicalLaboratories:0,specialties:0,countries:0,journeys:0 },distribution:{},journeyBreakdown:{},verified:0,awaiting:0,error:true };
  return <AdminDashboard copy={getAdminDictionary(locale)} data={data} locale={locale} />;
}

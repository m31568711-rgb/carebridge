import { notFound } from 'next/navigation';
import { DashboardShell } from '@/src/features/dashboard/dashboard-shell';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';
import { requireRoles } from '@/src/lib/auth/context';

export const dynamic = 'force-dynamic';
export default async function PatientLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); const dictionary = getDictionary(locale); const context = await requireRoles(locale, ['PATIENT']);
  return <DashboardShell context={context} dictionary={dictionary} locale={locale} portal="patient">{children}</DashboardShell>;
}

import { notFound } from '@/src/react-app/compat/navigation';
import { resolvePortalForRoles } from '@/src/config/roles';
import { NotificationCenter } from '@/src/features/notifications/notification-center';
import { DashboardShell } from '@/src/features/dashboard/dashboard-shell';
import { PageHeader } from '@/src/components/ui/page-header';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';
import { requireAuth } from '@/src/lib/auth/context';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  const context = await requireAuth(locale);
  const portal = resolvePortalForRoles(context.roles);

  return <DashboardShell context={context} dictionary={dictionary} locale={locale} portal={portal}><div className="mx-auto max-w-5xl"><PageHeader description={dictionary.notifications.pageDescription} title={dictionary.notifications.title} /><div className="mt-8"><NotificationCenter copy={dictionary.notifications} locale={locale} portal={portal} /></div></div></DashboardShell>;
}

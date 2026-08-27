import { notFound } from 'next/navigation';
import type { PortalKey } from '@/src/config/roles';
import { portalRoles } from '@/src/config/roles';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';
import { requireRoles } from '@/src/lib/auth/context';
import { DashboardHome } from './dashboard-home';
import { DashboardShell } from './dashboard-shell';

export async function PortalPage({ portal, localeParam }: { portal: PortalKey; localeParam: string }) {
  if (!isLocale(localeParam)) notFound();
  const dictionary = getDictionary(localeParam);
  const context = await requireRoles(localeParam, portalRoles[portal]);

  return <DashboardShell context={context} dictionary={dictionary} locale={localeParam} portal={portal}><DashboardHome dictionary={dictionary} portal={portal} /></DashboardShell>;
}

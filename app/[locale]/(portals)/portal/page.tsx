import { notFound, redirect } from 'next/navigation';
import { resolvePortalForRoles } from '@/src/config/roles';
import { isLocale } from '@/src/i18n/config';
import { requireAuth } from '@/src/lib/auth/context';

export const dynamic = 'force-dynamic';

export default async function PortalDispatcher({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const context = await requireAuth(locale);
  redirect(`/${locale}/${resolvePortalForRoles(context.roles)}`);
}

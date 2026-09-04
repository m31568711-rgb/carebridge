import { notFound, redirect } from '@/src/react-app/compat/navigation';
import { resolvePortalForRoles, usesDiagnosticProviderLanding } from '@/src/config/roles';
import { isLocale } from '@/src/i18n/config';
import { requireAuth } from '@/src/lib/auth/context';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';

export const dynamic = 'force-dynamic';

export default async function PortalDispatcher({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const context = await requireAuth(locale);
  const portal = resolvePortalForRoles(context.roles);

  if (portal === 'provider' && usesDiagnosticProviderLanding(context.roles)) {
    const supabase = await getSupabaseBrowserClient();
    if (supabase) {
      const [laboratory, radiology, membership] = await Promise.all([
        supabase.from('medical_laboratories').select('id').eq('owner_user_id', context.userId).eq('status', 'ACTIVE').limit(1).maybeSingle(),
        supabase.from('radiology_centers').select('id').eq('owner_user_id', context.userId).eq('status', 'ACTIVE').limit(1).maybeSingle(),
        supabase.from('diagnostic_provider_memberships').select('id').eq('user_id', context.userId).eq('is_active', true).limit(1).maybeSingle(),
      ]);
      if (laboratory.data || radiology.data || membership.data) redirect(`/${locale}/provider/diagnostics`);
    }
  }

  redirect(`/${locale}/${portal}`);
}

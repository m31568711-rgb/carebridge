import { PortalPage } from '@/src/features/dashboard/portal-page';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; return <PortalPage localeParam={locale} portal="pharmacy" />; }

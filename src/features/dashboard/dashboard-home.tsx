import { ArrowUpRight, BellRing, Compass, LockKeyhole, ShieldCheck, UserRoundCheck } from 'lucide-react';
import type { PortalKey } from '@/src/config/roles';
import type { Dictionary } from '@/src/i18n/messages/en';
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/ui/empty-state';
import { PageHeader } from '@/src/components/ui/page-header';
import { StatCard } from '@/src/components/ui/stat-card';
import { getPortalConfig } from './config';

export function DashboardHome({ portal, dictionary }: { portal: PortalKey; dictionary: Dictionary }) {
  const config = getPortalConfig(portal, dictionary);
  const stats = dictionary.dashboard.stats;
  const modules = [
    { icon: UserRoundCheck, title: dictionary.dashboard.modules.profileTitle, description: dictionary.dashboard.modules.profileDescription },
    { icon: Compass, title: dictionary.dashboard.modules.discoverTitle, description: dictionary.dashboard.modules.discoverDescription },
    { icon: ShieldCheck, title: portal === 'patient' ? dictionary.dashboard.modules.discoverTitle : dictionary.dashboard.modules.teamTitle, description: portal === 'patient' ? dictionary.dashboard.modules.discoverDescription : dictionary.dashboard.modules.teamDescription },
    { icon: LockKeyhole, title: dictionary.dashboard.modules.verifyTitle, description: dictionary.dashboard.modules.verifyDescription },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader description={config.description} eyebrow={dictionary.common.demoLabel} title={config.title} />
      <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900">{dictionary.dashboard.foundationNotice}</div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard hint={stats.profileHint} icon={UserRoundCheck} title={stats.profileTitle} value={stats.profileValue} />
        <StatCard hint={stats.journeyHint} icon={Compass} title={stats.journeyTitle} tone="violet" value={stats.journeyValue} />
        <StatCard hint={stats.notificationsHint} icon={BellRing} title={stats.notificationsTitle} tone="amber" value={stats.notificationsValue} />
        <StatCard hint={stats.securityHint} icon={LockKeyhole} title={stats.securityTitle} tone="emerald" value={stats.securityValue} />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-slate-950">{dictionary.dashboard.nextStepsTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{dictionary.dashboard.nextStepsDescription}</p></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {modules.map(({ icon: Icon, title, description }) => <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5" key={title}><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><Icon aria-hidden="true" className="size-5" /></span><Badge variant="slate">{dictionary.common.comingSoon}</Badge></div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{description}</p><span aria-hidden="true" className="mt-4 inline-flex text-slate-300"><ArrowUpRight className="size-4 rtl:-rotate-90" /></span></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-slate-950">{dictionary.dashboard.activityTitle}</h2></CardHeader>
          <CardContent><EmptyState description={dictionary.dashboard.activityEmptyDescription} title={dictionary.dashboard.activityEmptyTitle} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

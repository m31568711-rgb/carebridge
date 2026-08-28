import { BadgeCheck, Building2, FlaskConical, Globe2, Hospital, Pill, ScanLine, ShieldAlert, Stethoscope, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { PageHeader } from '@/src/components/ui/page-header';
import { StatCard } from '@/src/components/ui/stat-card';
import type { Locale } from '@/src/i18n/config';
import { formatEnum } from './format';
import type { AdminDictionary } from './messages';

interface DashboardData {
  counts: { hospitals: number; doctors: number; pharmacies: number; radiologyCenters: number; medicalLaboratories: number; specialties: number; countries: number };
  distribution: Record<string, number>;
  verified: number;
  awaiting: number;
  error: boolean;
}

export function AdminDashboard({ copy, data, locale }: { copy: AdminDictionary; data: DashboardData; locale: Locale }) {
  const stats: Array<[string, string, LucideIcon, 'blue' | 'emerald' | 'violet' | 'amber']> = [
    [copy.dashboard.hospitals, String(data.counts.hospitals), Hospital, 'blue'],
    [copy.dashboard.doctors, String(data.counts.doctors), Stethoscope, 'violet'],
    [copy.dashboard.pharmacies, String(data.counts.pharmacies), Pill, 'emerald'],
    [copy.dashboard.radiologyCenters, String(data.counts.radiologyCenters), ScanLine, 'blue'],
    [copy.dashboard.medicalLaboratories, String(data.counts.medicalLaboratories), FlaskConical, 'violet'],
    [copy.dashboard.specialties, String(data.counts.specialties), Building2, 'amber'],
    [copy.dashboard.verified, String(data.verified), BadgeCheck, 'emerald'],
    [copy.dashboard.awaiting, String(data.awaiting), ShieldAlert, 'amber'],
    [copy.dashboard.countries, String(data.counts.countries), Globe2, 'blue'],
  ];
  const providerMaximum = Math.max(1, data.counts.hospitals, data.counts.doctors, data.counts.pharmacies, data.counts.radiologyCenters, data.counts.medicalLaboratories);
  const stateMaximum = Math.max(1, ...Object.values(data.distribution));
  return (
    <div className="mx-auto max-w-[92rem]">
      <PageHeader description={copy.dashboard.description} eyebrow={copy.dashboard.eyebrow} title={copy.dashboard.title} />
      {data.error ? <div className="mt-6 rounded-xl border border-[#f1e2bc] bg-[#fbf3df] px-4 py-3 text-sm text-[#7c5819]">{copy.dashboard.databaseUnavailable}</div> : null}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([title, value, icon, tone]) => <StatCard hint={title} icon={icon} key={title} title={title} tone={tone} value={value} />)}</div>
      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><h2 className="type-h3 text-[var(--foreground)]">{copy.dashboard.providersByType}</h2></CardHeader><CardContent className="space-y-5">{[[copy.dashboard.hospitals, data.counts.hospitals], [copy.dashboard.doctors, data.counts.doctors], [copy.dashboard.pharmacies, data.counts.pharmacies], [copy.dashboard.radiologyCenters, data.counts.radiologyCenters], [copy.dashboard.medicalLaboratories, data.counts.medicalLaboratories]].map(([label, value]) => <div key={String(label)}><div className="flex justify-between text-sm"><span className="text-[#53697b]">{label}</span><strong className="text-[var(--foreground)]">{value}</strong></div><div className="mt-2 h-2 rounded-full bg-[#edf3f7]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.max(4, Number(value) / providerMaximum * 100)}%` }} /></div></div>)}</CardContent></Card>
        <Card><CardHeader><h2 className="type-h3 text-[var(--foreground)]">{copy.dashboard.verificationDistribution}</h2></CardHeader><CardContent className="space-y-4">{Object.entries(data.distribution).map(([label, value]) => <div className="grid grid-cols-[minmax(8rem,1fr)_2fr_auto] items-center gap-3 text-sm" key={label}><span className="truncate text-[#53697b]">{formatEnum(label, locale)}</span><div className="h-2 rounded-full bg-[#edf3f7]"><div className="h-full rounded-full bg-[#2f7f9d]" style={{ width: `${Math.max(4, value / stateMaximum * 100)}%` }} /></div><strong>{value}</strong></div>)}</CardContent></Card>
      </div>
    </div>
  );
}

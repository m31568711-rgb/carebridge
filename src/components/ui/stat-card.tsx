import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './card';

interface StatCardProps {
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: 'blue' | 'emerald' | 'violet' | 'amber';
}

const tones = {
  blue: 'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  violet: 'bg-violet-50 text-violet-700',
  amber: 'bg-amber-50 text-amber-700',
};

export function StatCard({ title, value, hint, icon: Icon, tone = 'blue' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
          <span className={`grid size-11 place-items-center rounded-2xl ${tones[tone]}`}><Icon aria-hidden="true" className="size-5" /></span>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

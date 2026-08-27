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
  blue: 'bg-[#eaf3f9] text-[#164b7a]',
  emerald: 'bg-[#eaf6f1] text-[#217a5b]',
  violet: 'bg-[#f0eff8] text-[#62558e]',
  amber: 'bg-[#fbf3df] text-[#8b611a]',
};

export function StatCard({ title, value, hint, icon: Icon, tone = 'blue' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#617587]">{title}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
          </div>
          <span className={`grid size-11 place-items-center rounded-2xl ${tones[tone]}`}><Icon aria-hidden="true" className="size-5" /></span>
        </div>
        <p className="mt-5 text-xs leading-5 text-[#708496]">{hint}</p>
      </CardContent>
    </Card>
  );
}

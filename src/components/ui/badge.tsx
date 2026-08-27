import type { HTMLAttributes } from 'react';
import { cn } from '@/src/lib/utils/cn';

const variants = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-800 ring-amber-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = 'blue', ...props }: BadgeProps) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', variants[variant], className)} {...props} />;
}

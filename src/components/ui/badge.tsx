import type { HTMLAttributes } from 'react';
import { cn } from '@/src/lib/utils/cn';

const variants = {
  blue: 'bg-[#eaf3f9] text-[#164b7a] ring-[#d4e5ef]',
  green: 'bg-[#eaf6f1] text-[#217a5b] ring-[#d0e9df]',
  amber: 'bg-[#fbf3df] text-[#8b611a] ring-[#f1e2bc]',
  slate: 'bg-[#eef3f6] text-[#53697b] ring-[#dce6ec]',
  rose: 'bg-[#fbecef] text-[#a43547] ring-[#f3d5dc]',
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = 'blue', ...props }: BadgeProps) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[0.72rem] font-semibold tracking-[0.01em] ring-1 ring-inset', variants[variant], className)} {...props} />;
}

import type { HTMLAttributes } from 'react';
import { cn } from '@/src/lib/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'panel' | 'form';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  return <div className={cn(
    'rounded-[var(--radius-lg)] border border-[var(--border)] bg-white shadow-[var(--shadow-card)]',
    variant === 'interactive' && 'transition duration-200 hover:-translate-y-0.5 hover:border-[#b8d1df] hover:shadow-[var(--shadow-raised)]',
    variant === 'panel' && 'shadow-none',
    variant === 'form' && 'border-[#d5e3ec] shadow-[0_20px_55px_-40px_rgba(16,42,67,.45)]',
    className,
  )} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pb-0 sm:p-6 sm:pb-0', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center border-t border-slate-100 p-6', className)} {...props} />;
}

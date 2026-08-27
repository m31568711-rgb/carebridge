import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/src/lib/utils/cn';

const variants = {
  primary: 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700',
  secondary: 'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-blue-200 hover:bg-blue-50/50',
  subtle: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
  danger: 'bg-rose-600 text-white shadow-lg shadow-rose-600/15 hover:bg-rose-700',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        size === 'sm' && 'min-h-9 px-3.5 text-sm',
        size === 'md' && 'min-h-11 px-5 text-sm',
        size === 'lg' && 'min-h-13 rounded-2xl px-6 text-base',
        className,
      )}
      disabled={disabled || loading}
      ref={ref}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';

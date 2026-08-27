import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/src/lib/utils/cn';

const variants = {
  primary: 'bg-[var(--primary)] text-white shadow-[0_12px_28px_-16px_rgba(22,75,122,.8)] hover:bg-[var(--primary-hover)]',
  secondary: 'bg-[#eaf3f9] text-[#164b7a] hover:bg-[#dcebf4]',
  outline: 'border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm hover:border-[#9bbdce] hover:bg-[#f7fafc]',
  subtle: 'bg-[#eaf3f9] text-[#164b7a] hover:bg-[#dcebf4]',
  ghost: 'text-[#53697b] hover:bg-[#edf3f7] hover:text-[var(--foreground)]',
  danger: 'bg-[#b33a4b] text-white shadow-[0_12px_28px_-16px_rgba(179,58,75,.7)] hover:bg-[#982f3e]',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#bad7e6]/60 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        size === 'sm' && 'min-h-9 px-3.5 text-sm',
        size === 'md' && 'min-h-11 px-5 text-sm',
        size === 'lg' && 'min-h-12 rounded-[var(--radius-md)] px-6 text-base',
        size === 'icon' && 'size-10 shrink-0 p-0',
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

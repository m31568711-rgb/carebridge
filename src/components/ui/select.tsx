import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/src/lib/utils/cn';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        'min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3.5 text-sm text-[var(--foreground)] shadow-[0_1px_2px_rgba(16,42,67,.04)] outline-none transition focus:border-[#6fa6bf] focus:ring-4 focus:ring-[#d8eaf2] disabled:cursor-not-allowed disabled:bg-[#f0f4f7]',
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = 'Select';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/src/lib/utils/cn';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'min-h-28 w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--foreground)] shadow-[0_1px_2px_rgba(16,42,67,.04)] outline-none transition placeholder:text-[#8294a3] focus:border-[#6fa6bf] focus:ring-4 focus:ring-[#d8eaf2] disabled:cursor-not-allowed disabled:bg-[#f0f4f7]',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';

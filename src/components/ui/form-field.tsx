import type { ReactNode } from 'react';
import { cn } from '@/src/lib/utils/cn';

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ id, label, hint, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-semibold text-slate-800" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true" className="ms-1 text-rose-600">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-sm text-rose-700" id={`${id}-error`} role="alert">{error}</p> : null}
      {!error && hint ? <p className="text-xs leading-5 text-slate-500" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}

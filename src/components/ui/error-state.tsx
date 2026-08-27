import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

interface ErrorStateProps {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-6 py-10 text-center" role="alert">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-rose-600 shadow-sm"><AlertTriangle aria-hidden="true" className="size-6" /></span>
      <h2 className="mt-5 font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {retryLabel && onRetry ? <Button className="mt-5" onClick={onRetry} type="button" variant="secondary">{retryLabel}</Button> : null}
    </div>
  );
}

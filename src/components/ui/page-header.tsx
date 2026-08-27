import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="type-caption uppercase text-[var(--primary)]">{eyebrow}</p> : null}
        <h1 className="type-h1 mt-2 text-[var(--foreground)]">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

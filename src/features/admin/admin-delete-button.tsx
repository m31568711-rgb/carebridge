'use client';

import { Trash2 } from 'lucide-react';
import { ConfirmSubmit } from './confirm-submit';
import type { Locale } from '@/src/i18n/config';

export function AdminDeleteButton({ confirmLabel, label, locale = 'en' }: { confirmLabel: string; label: string; locale?: Locale }) {
  return (
    <ConfirmSubmit label={label} description={confirmLabel} locale={locale}>
      <Trash2 aria-hidden="true" className="size-4" />
    </ConfirmSubmit>
  );
}

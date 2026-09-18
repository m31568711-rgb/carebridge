'use client';
import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/src/components/ui/button';
import { ConfirmationDialog } from '@/src/components/ui/confirmation-dialog';
import type { Locale } from '@/src/i18n/config';

export function ConfirmSubmit({ label, description, locale, children, name, value, disabled = false }: {
  label: string; description?: string; locale: Locale; children?: ReactNode; disabled?: boolean; name?: string; value?: string;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const submitter = useRef<HTMLButtonElement>(null);
  const cancel = locale === 'ar' ? '\u0625\u0644\u063a\u0627\u0621' : locale === 'fr' ? 'Annuler' : 'Cancel';
  return <><Button ref={button} aria-label={label} disabled={disabled} onClick={() => setOpen(true)} type="button" size="sm" variant="outline">{children ?? label}</Button>
    <button hidden ref={submitter} type="submit" name={name} value={value} />
    <ConfirmationDialog open={open} onClose={() => setOpen(false)} onConfirm={() => { const form = button.current?.form; setOpen(false); if (form && submitter.current) form.requestSubmit(submitter.current); }} title={label} description={description ?? label} confirmLabel={label} cancelLabel={cancel} closeLabel={cancel} destructive />
  </>;
}

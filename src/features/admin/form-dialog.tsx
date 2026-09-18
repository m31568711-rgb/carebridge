'use client';
import { useState, type ReactNode } from 'react';
import { Dialog } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';

export function AdminFormDialog({ title, closeLabel, children, enabled = true }: { title: string; closeLabel: string; children: ReactNode; enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!enabled) return <>{children}</>;
  return <><Button onClick={() => setOpen(true)} type="button" variant="outline">{title}</Button>
    <Dialog className="max-w-3xl" open={open} onClose={() => setOpen(false)} title={title} closeLabel={closeLabel}>{children}</Dialog>
  </>;
}

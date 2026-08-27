'use client';

import { Button } from './button';
import { Dialog } from './dialog';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmationDialog({ open, onClose, onConfirm, title, description, confirmLabel, cancelLabel, closeLabel, destructive, loading }: ConfirmationDialogProps) {
  return (
    <Dialog
      closeLabel={closeLabel}
      footer={
        <>
          <Button onClick={onClose} type="button" variant="secondary">{cancelLabel}</Button>
          <Button loading={loading} onClick={onConfirm} type="button" variant={destructive ? 'danger' : 'primary'}>{confirmLabel}</Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={title}
    >
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </Dialog>
  );
}

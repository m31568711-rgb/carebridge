'use client';

import { Trash2 } from 'lucide-react';

export function AdminDeleteButton({ confirmLabel, label }: { confirmLabel: string; label: string }) {
  return (
    <button
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg text-[#a43547] transition hover:bg-[#fbecef]"
      onClick={(event) => { if (!window.confirm(confirmLabel)) event.preventDefault(); }}
      type="submit"
    >
      <Trash2 aria-hidden="true" className="size-4" />
    </button>
  );
}
